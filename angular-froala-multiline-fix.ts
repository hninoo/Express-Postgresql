// Angular Component with Multi-line Text Positioning Fix
import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

declare var $: any;

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit, AfterViewInit {
  @ViewChild('froalaEditor', { static: false }) froalaEditor!: ElementRef;
  
  editorForm: FormGroup;
  private editorInstance: any;
  
  editorOptions: any = {
    charCounterCount: true,
    toolbarButtons: [
      'bold', 'italic', 'underline', 'strikeThrough',
      '|',
      'fontFamily', 'fontSize', 'color',
      '|',
      'paragraphFormat', 'align', 'formatOL', 'formatUL',
      '|',
      'insertLink', 'insertImage', 'insertTable',
      '|',
      'undo', 'redo', 'fullscreen'
    ],
    
    linkList: [
      { text: 'Froala', href: 'https://froala.com', target: '_blank' },
      { text: 'Google', href: 'https://google.com', target: '_blank' },
      { text: 'Facebook', href: 'https://facebook.com', target: '_blank' }
    ],
    
    linkInsertButtons: ['linkBack', 'linkList'],
    linkEditButtons: ['linkOpen', 'linkStyle', 'linkEdit', 'linkRemove'],
    
    events: {
      'froalaEditor.initialized': () => {
        this.setupMultiLinePositioning();
      }
    }
  };

  constructor(
    private fb: FormBuilder,
    private zone: NgZone
  ) {
    this.editorForm = this.fb.group({
      title: ['', Validators.required],
      content: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    // Additional setup after view init
  }

  // Setup multi-line positioning
  private setupMultiLinePositioning(): void {
    this.zone.runOutsideAngular(() => {
      const editorElement = this.froalaEditor.nativeElement;
      this.editorInstance = $(editorElement).data('froala.editor');
      
      if (this.editorInstance) {
        // Override popup positioning
        this.editorInstance.events.on('popups.show.link.insert', () => {
          this.handleMultiLinePopup('link.insert');
        });
        
        this.editorInstance.events.on('popups.show.link.edit', () => {
          this.handleMultiLinePopup('link.edit');
        });
        
        // Handle link selection
        this.editorInstance.events.on('commands.after', (cmd: string, param1: any) => {
          if (cmd === 'linkList') {
            this.handleLinkSelection(param1);
          }
        });
      }
    });
  }

  // Handle multi-line popup positioning
  private handleMultiLinePopup(popupType: string): void {
    setTimeout(() => {
      try {
        const popup = this.editorInstance.popups.get(popupType);
        
        if (popup) {
          // Get multi-line aware position
          const targetInfo = this.getMultiLinePosition();
          
          // Calculate position
          const position = this.calculateMultiLinePosition(targetInfo, popup);
          
          // Apply position
          this.applyMultiLinePosition(popup, position, popupType);
          
          // Set Japanese localization
          this.setJapaneseLocalization(popup);
          
          // Setup repositioning events
          this.setupRepositioning(popupType);
        }
      } catch (error) {
        console.error('Multi-line positioning error:', error);
      }
    }, 50);
  }

  // Get position with multi-line text awareness
  private getMultiLinePosition(): any {
    try {
      const selection = window.getSelection();
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        
        if (rects.length > 1) {
          // Multi-line selection: analyze all lines
          const firstLine = rects[0];
          const lastLine = rects[rects.length - 1];
          
          // Use the line with more content or the first line
          let targetLine = firstLine;
          
          // If first line is very short, check if second line is better
          if (firstLine.width < 50 && rects.length > 1 && rects[1].width > firstLine.width) {
            targetLine = rects[1];
          }
          
          return {
            x: targetLine.left + (targetLine.width / 2),
            y: targetLine.top,
            height: targetLine.height,
            width: targetLine.width,
            isMultiLine: true,
            lineCount: rects.length,
            allLines: Array.from(rects),
            selectedLine: targetLine
          };
        } else if (rects.length === 1) {
          // Single line
          const rect = rects[0];
          return {
            x: rect.left + (rect.width / 2),
            y: rect.top,
            height: rect.height,
            width: rect.width,
            isMultiLine: false
          };
        }
      }
      
      // Fallback to cursor position
      return this.getCursorPositionFallback();
      
    } catch (e) {
      console.warn('Multi-line position detection failed:', e);
      return this.getCursorPositionFallback();
    }
  }

  // Fallback cursor position
  private getCursorPositionFallback(): any {
    const editorOffset = $(this.froalaEditor.nativeElement).offset();
    return {
      x: editorOffset.left + 200,
      y: editorOffset.top + 100,
      height: 20,
      width: 0,
      isMultiLine: false,
      isFallback: true
    };
  }

  // Calculate position for multi-line scenarios
  private calculateMultiLinePosition(target: any, popup: any): any {
    const popupWidth = popup.outerWidth();
    const popupHeight = popup.outerHeight();
    
    // Base calculation
    let left = target.x - (popupWidth / 2);
    let top = target.y - popupHeight - 15;
    
    // Viewport boundaries
    const viewportLeft = window.pageXOffset;
    const viewportTop = window.pageYOffset;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Horizontal adjustment
    const padding = 15;
    const minLeft = viewportLeft + padding;
    const maxLeft = viewportLeft + viewportWidth - popupWidth - padding;
    
    left = Math.max(minLeft, Math.min(left, maxLeft));
    
    // Vertical adjustment for multi-line
    const spaceAbove = target.y - viewportTop;
    const spaceBelow = viewportTop + viewportHeight - (target.y + target.height);
    
    let showAbove = true;
    
    if (target.isMultiLine) {
      // For multi-line, need more space considerations
      const requiredSpaceAbove = popupHeight + 30;
      const requiredSpaceBelow = popupHeight + 30;
      
      if (spaceAbove < requiredSpaceAbove && spaceBelow > requiredSpaceBelow) {
        // Show below
        top = target.y + target.height + 15;
        showAbove = false;
      } else if (spaceAbove < requiredSpaceAbove && spaceBelow < requiredSpaceBelow) {
        // Center in viewport
        top = viewportTop + (viewportHeight - popupHeight) / 2;
        showAbove = null; // No arrow
      }
    } else {
      // Single line logic
      if (spaceAbove < popupHeight + 20) {
        top = target.y + target.height + 15;
        showAbove = false;
      }
    }
    
    // Arrow calculation
    let arrowMargin = target.x - left - (popupWidth / 2);
    
    // Constrain arrow
    const arrowPadding = 25;
    const maxArrow = (popupWidth / 2) - arrowPadding;
    const minArrow = -(popupWidth / 2) + arrowPadding;
    
    arrowMargin = Math.max(minArrow, Math.min(arrowMargin, maxArrow));
    
    return {
      left: Math.round(left),
      top: Math.round(top),
      arrowMargin: Math.round(arrowMargin),
      showAbove: showAbove
    };
  }

  // Apply multi-line aware positioning
  private applyMultiLinePosition(popup: any, position: any, popupType: string): void {
    popup.css({
      'left': position.left + 'px',
      'top': position.top + 'px',
      'margin-bottom': '5px',
      'z-index': '5'
    });
    
    // Arrow positioning
    if (position.showAbove !== null) {
      popup.find('.fr-arrow').css('margin-left', position.arrowMargin + 'px');
      
      if (position.showAbove) {
        popup.addClass('fr-above').removeClass('fr-below');
      } else {
        popup.addClass('fr-below').removeClass('fr-above');
      }
    } else {
      popup.find('.fr-arrow').hide();
    }
    
    // Dropdown positioning for insert popup
    if (popupType === 'link.insert') {
      popup.find('.fr-dropdown-menu').css({
        'left': '4px',
        'top': '38px',
        'margin-bottom': '5px'
      });
    }
  }

  // Set Japanese localization
  private setJapaneseLocalization(popup: any): void {
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
  }

  // Handle link selection
  private handleLinkSelection(param1: any): void {
    const popup = this.editorInstance.popups.get('link.insert');
    const linkData = this.editorOptions.linkList[param1];
    
    if (linkData && popup) {
      popup.find('input[name="href"]').val(linkData.href).addClass('fr-not-empty').removeAttr('disabled');
      popup.find('input[name="text"]').val(linkData.text).addClass('fr-not-empty').removeAttr('disabled');
      
      if (linkData.target === '_blank') {
        popup.find('input[name="target"]').prop('checked', true).addClass('fr-not-empty').removeAttr('disabled');
      }
      
      popup.find('input').removeAttr('disabled');
      popup.find('.fr-dropdown-menu').attr('aria-hidden', 'true');
      popup.find('.fr-dropdown').removeClass('fr-active').attr('aria-expanded', 'false');
    }
  }

  // Setup repositioning events
  private setupRepositioning(popupType: string): void {
    let repositionTimer: any;
    
    const reposition = () => {
      clearTimeout(repositionTimer);
      repositionTimer = setTimeout(() => {
        if (this.editorInstance && this.editorInstance.popups.isVisible(popupType)) {
          this.handleMultiLinePopup(popupType);
        }
      }, 150);
    };
    
    $(window).off('.multiline-popup').on('resize.multiline-popup scroll.multiline-popup', reposition);
    $(document).off('.multiline-popup').on('selectionchange.multiline-popup', reposition);
    
    // Cleanup
    this.editorInstance.events.on('popups.hide.' + popupType, () => {
      $(window).off('.multiline-popup');
      $(document).off('.multiline-popup');
    });
  }

  onSubmit(): void {
    if (this.editorForm.valid) {
      console.log('Form submitted:', this.editorForm.value);
    }
  }
}