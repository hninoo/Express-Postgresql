// Dynamic Positioning for Froala Link Popups - Multi-line Text Support
$(function(){
  $('#edit').froalaEditor({
    linkList: [
      { text: 'Froala', href: 'https://froala.com', target: '_blank' },
      { text: 'Google', href: 'https://google.com', target: '_blank' },
      { text: 'Facebook', href: 'https://facebook.com', target: '_blank' }
    ],
    
    linkInsertButtons: ['linkBack', 'linkList'],
    linkEditButtons: ['linkOpen', 'linkStyle', 'linkEdit', 'linkRemove'],
    
    events: {
      // Handle link insert popup
      'popups.show.link.insert': function () {
        setDynamicPopupPosition.call(this, 'link.insert');
      },
      
      // Handle link edit popup  
      'popups.show.link.edit': function () {
        setDynamicPopupPosition.call(this, 'link.edit');
      },
      
      // Handle link selection from dropdown
      'commands.after': function (cmd, param1) {
        if (cmd === 'linkList') {
          handleLinkSelection.call(this, param1);
        }
      }
    }
  });
  
  // Main dynamic positioning function
  function setDynamicPopupPosition(popupType) {
    var editor = this;
    var popup = editor.popups.get(popupType);
    
    setTimeout(function() {
      try {
        // Get target position for multi-line text
        var targetInfo = getMultiLineTargetPosition(editor);
        
        // Calculate optimal popup position
        var position = calculateOptimalPosition(targetInfo, popup);
        
        // Apply positioning
        applyPopupPosition(popup, position, popupType);
        
        // Set Japanese labels
        setJapaneseLabels(popup);
        
        // Setup dynamic events for repositioning
        setupDynamicRepositioning(editor, popupType);
        
        console.log('Popup positioned:', {
          type: popupType,
          position: position,
          target: targetInfo
        });
        
      } catch (error) {
        console.error('Positioning error:', error);
        // Fallback positioning
        fallbackPositioning(popup, popupType);
      }
    }, 50);
  }
  
  // Get target position with multi-line text support
  function getMultiLineTargetPosition(editor) {
    try {
      var selection = window.getSelection();
      
      if (selection && selection.rangeCount > 0) {
        var range = selection.getRangeAt(0);
        var rects = range.getClientRects();
        
        if (rects.length > 0) {
          // Handle multi-line selection
          if (rects.length > 1) {
            // For multi-line: use first line position
            var firstRect = rects[0];
            var lastRect = rects[rects.length - 1];
            
            return {
              x: firstRect.left + (firstRect.width / 2),
              y: firstRect.top,
              height: firstRect.height,
              width: firstRect.width,
              isMultiLine: true,
              firstLine: firstRect,
              lastLine: lastRect,
              totalHeight: lastRect.bottom - firstRect.top
            };
          } else {
            // Single line selection
            var rect = rects[0];
            return {
              x: rect.left + (rect.width / 2),
              y: rect.top,
              height: rect.height,
              width: rect.width,
              isMultiLine: false
            };
          }
        }
      }
      
      // No selection: get cursor position
      return getCursorPosition(editor);
      
    } catch (e) {
      console.warn('Target position detection failed:', e);
      return getEditorCenterPosition(editor);
    }
  }
  
  // Get cursor position using markers
  function getCursorPosition(editor) {
    try {
      // Save current state
      var wasCollapsed = editor.selection.isCollapsed();
      
      if (wasCollapsed) {
        // Insert temporary marker
        var marker = editor.markers.insert();
        if (marker) {
          var $marker = $(marker);
          var offset = $marker.offset();
          
          // Get position
          var position = {
            x: offset.left,
            y: offset.top,
            height: $marker.outerHeight() || 20,
            width: 0,
            isMultiLine: false,
            isCursor: true
          };
          
          // Remove marker
          $marker.remove();
          editor.selection.restore();
          
          return position;
        }
      }
      
      return getEditorCenterPosition(editor);
      
    } catch (e) {
      return getEditorCenterPosition(editor);
    }
  }
  
  // Fallback: get editor center position
  function getEditorCenterPosition(editor) {
    var editorOffset = editor.$el.offset();
    return {
      x: editorOffset.left + (editor.$el.outerWidth() / 2),
      y: editorOffset.top + 100,
      height: 20,
      width: 200,
      isMultiLine: false,
      isFallback: true
    };
  }
  
  // Calculate optimal position for popup
  function calculateOptimalPosition(target, popup) {
    var $window = $(window);
    var popupWidth = popup.outerWidth();
    var popupHeight = popup.outerHeight();
    
    // Base position calculation
    var left = target.x - (popupWidth / 2);
    var top = target.y - popupHeight - 15; // 15px gap above
    
    // Viewport constraints
    var viewportLeft = $window.scrollLeft();
    var viewportTop = $window.scrollTop();
    var viewportWidth = $window.width();
    var viewportHeight = $window.height();
    
    // Horizontal constraints
    var minLeft = viewportLeft + 10;
    var maxLeft = viewportLeft + viewportWidth - popupWidth - 10;
    
    if (left < minLeft) {
      left = minLeft;
    } else if (left > maxLeft) {
      left = maxLeft;
    }
    
    // Vertical positioning logic
    var showAbove = true;
    var spaceAbove = target.y - viewportTop;
    var spaceBelow = viewportTop + viewportHeight - (target.y + target.height);
    
    // Check if popup fits above
    if (spaceAbove < popupHeight + 20) {
      if (spaceBelow > popupHeight + 20) {
        // Show below
        top = target.y + target.height + 15;
        showAbove = false;
      } else {
        // Not enough space either way - position in best available space
        if (spaceAbove > spaceBelow) {
          top = Math.max(viewportTop + 10, target.y - popupHeight - 10);
          showAbove = true;
        } else {
          top = Math.min(viewportTop + viewportHeight - popupHeight - 10, target.y + target.height + 10);
          showAbove = false;
        }
      }
    }
    
    // Calculate arrow position
    var arrowMargin = target.x - left - (popupWidth / 2);
    
    // Constrain arrow within popup bounds
    var maxArrowMargin = (popupWidth / 2) - 20;
    var minArrowMargin = -(popupWidth / 2) + 20;
    
    if (arrowMargin > maxArrowMargin) {
      arrowMargin = maxArrowMargin;
    } else if (arrowMargin < minArrowMargin) {
      arrowMargin = minArrowMargin;
    }
    
    return {
      left: Math.round(left),
      top: Math.round(top),
      arrowMargin: Math.round(arrowMargin),
      showAbove: showAbove,
      target: target
    };
  }
  
  // Apply positioning to popup
  function applyPopupPosition(popup, position, popupType) {
    // Set popup position
    popup.css({
      'left': position.left + 'px',
      'top': position.top + 'px',
      'margin-bottom': '5px',
      'z-index': '5'
    });
    
    // Set arrow position
    popup.find('.fr-arrow').css('margin-left', position.arrowMargin + 'px');
    
    // Add appropriate classes for above/below
    if (position.showAbove) {
      popup.addClass('fr-above').removeClass('fr-below');
    } else {
      popup.addClass('fr-below').removeClass('fr-above');
    }
    
    // Set dropdown position for insert popup
    if (popupType === 'link.insert') {
      popup.find('.fr-dropdown-menu').css({
        'left': '4px',
        'top': '38px',
        'margin-bottom': '5px'
      });
    }
  }
  
  // Set Japanese labels and titles
  function setJapaneseLabels(popup) {
    // Input placeholders and labels
    popup.find('input[name="text"]').attr('placeholder', 'テキスト');
    popup.find('label[for*="text"]').text('テキスト');
    popup.find('label[for*="target"]').text('新しいタブで開く');
    popup.find('.fr-submit').text('更新');
    
    // Button titles
    popup.find('[data-cmd="linkOpen"]').attr('title', 'リンクを開く');
    popup.find('[data-cmd="linkStyle"]').attr('title', 'スタイル');
    popup.find('[data-cmd="linkEdit"]').attr('title', 'リンクの編集');
    popup.find('[data-cmd="linkRemove"]').attr('title', 'リンクの削除');
    popup.find('[data-cmd="linkBack"]').attr('title', '戻る');
    popup.find('[data-cmd="linkList"]').attr('title', 'リンクを選択');
    
    // Screen reader text
    popup.find('.fr-sr-only').each(function() {
      var cmd = $(this).parent().data('cmd');
      switch(cmd) {
        case 'linkOpen': $(this).text('リンクを開く'); break;
        case 'linkStyle': $(this).text('スタイル'); break;
        case 'linkEdit': $(this).text('リンクの編集'); break;
        case 'linkRemove': $(this).text('リンクの削除'); break;
        case 'linkBack': $(this).text('戻る'); break;
        case 'linkList': $(this).text('リンクを選択'); break;
      }
    });
  }
  
  // Handle link selection from dropdown
  function handleLinkSelection(param1) {
    var popup = this.popups.get('link.insert');
    var linkData = this.opts.linkList[param1];
    
    if (linkData && popup) {
      // Set URL
      popup.find('input[name="href"]')
        .val(linkData.href)
        .addClass('fr-not-empty')
        .removeAttr('disabled');
      
      // Set text
      popup.find('input[name="text"]')
        .val(linkData.text)
        .addClass('fr-not-empty')
        .removeAttr('disabled');
      
      // Set target checkbox
      if (linkData.target === '_blank') {
        popup.find('input[name="target"]')
          .prop('checked', true)
          .addClass('fr-not-empty')
          .removeAttr('disabled');
      }
      
      // Enable all inputs
      popup.find('input').removeAttr('disabled');
      
      // Hide dropdown
      popup.find('.fr-dropdown-menu').attr('aria-hidden', 'true');
      popup.find('.fr-dropdown').removeClass('fr-active').attr('aria-expanded', 'false');
    }
  }
  
  // Setup dynamic repositioning events
  function setupDynamicRepositioning(editor, popupType) {
    var repositionTimer;
    
    function repositionPopup() {
      clearTimeout(repositionTimer);
      repositionTimer = setTimeout(function() {
        if (editor.popups && editor.popups.isVisible(popupType)) {
          setDynamicPopupPosition.call(editor, popupType);
        }
      }, 100);
    }
    
    // Bind events with unique namespace
    var namespace = '.froala-' + popupType.replace('.', '-');
    
    $(window).off(namespace).on('resize' + namespace + ' scroll' + namespace, repositionPopup);
    $(document).off(namespace).on('selectionchange' + namespace, repositionPopup);
    
    // Cleanup on popup hide
    editor.events.on('popups.hide.' + popupType, function() {
      $(window).off(namespace);
      $(document).off(namespace);
    });
  }
  
  // Fallback positioning if calculation fails
  function fallbackPositioning(popup, popupType) {
    var positions = {
      'link.edit': { left: 252, top: 1105, arrowMargin: -5 },
      'link.insert': { left: 178, top: 937, arrowMargin: -5 }
    };
    
    var pos = positions[popupType] || { left: 200, top: 200, arrowMargin: -5 };
    
    popup.css({
      'left': pos.left + 'px',
      'top': pos.top + 'px',
      'margin-bottom': '5px',
      'z-index': '5'
    });
    
    popup.find('.fr-arrow').css('margin-left', pos.arrowMargin + 'px');
    
    if (popupType === 'link.insert') {
      popup.find('.fr-dropdown-menu').css({
        'left': '4px',
        'top': '38px',
        'margin-bottom': '5px'
      });
    }
  }
});