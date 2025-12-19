import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';

export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 240,
        parseHTML: element => {
          const width = element.style.width || element.getAttribute('width');
          return width ? parseInt(width) : 240;
        },
        renderHTML: attributes => {
          return {
            width: attributes.width,
            style: `width: ${attributes.width}px`,
          };
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const height = element.style.height || element.getAttribute('height');
          return height ? parseInt(height) : null;
        },
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return {
            height: attributes.height,
            style: `height: ${attributes.height}px`,
          };
        },
      },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement('div');
      container.className = 'image-resizer';
      container.style.cssText = `
        display: inline-block;
        position: relative;
        margin: 8px 8px 8px 0;
        max-width: 100%;
      `;

      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      img.style.cssText = `
        width: ${node.attrs.width}px;
        height: auto;
        display: block;
        border-radius: 0.5rem;
        border: 1px solid hsl(var(--border));
        cursor: pointer;
      `;

      let isResizing = false;
      let startX = 0;
      let startWidth = 0;

      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      resizeHandle.style.cssText = `
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        background: hsl(var(--primary));
        border-radius: 0 0 0.5rem 0;
        cursor: nwse-resize;
        opacity: 0;
        transition: opacity 0.2s;
      `;

      const deleteButton = document.createElement('button');
      deleteButton.className = 'image-delete-btn';
      deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
      `;
      deleteButton.style.cssText = `
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.2s, background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        backdrop-filter: blur(4px);
      `;

      container.appendChild(img);
      container.appendChild(resizeHandle);
      container.appendChild(deleteButton);

      container.addEventListener('mouseenter', () => {
        if (editor.isEditable) {
          resizeHandle.style.opacity = '0.8';
          deleteButton.style.opacity = '1';
        }
      });

      container.addEventListener('mouseleave', () => {
        if (!isResizing) {
          resizeHandle.style.opacity = '0';
          deleteButton.style.opacity = '0';
        }
      });

      deleteButton.addEventListener('mouseenter', () => {
        deleteButton.style.background = 'rgba(0, 0, 0, 0.8)';
      });

      deleteButton.addEventListener('mouseleave', () => {
        deleteButton.style.background = 'rgba(0, 0, 0, 0.6)';
      });

      deleteButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (typeof getPos === 'function') {
          const pos = getPos();
          const transaction = editor.state.tr.delete(pos, pos + node.nodeSize);
          editor.view.dispatch(transaction);
        }
      });

      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startWidth = node.attrs.width;

        const onMouseMove = (e: MouseEvent) => {
          if (!isResizing) return;
          const deltaX = e.clientX - startX;
          const newWidth = Math.max(100, Math.min(1000, startWidth + deltaX));
          img.style.width = `${newWidth}px`;
        };

        const onMouseUp = () => {
          if (!isResizing) return;
          isResizing = false;
          resizeHandle.style.opacity = '0';

          const newWidth = parseInt(img.style.width);
          if (typeof getPos === 'function') {
            editor.commands.updateAttributes('image', { width: newWidth });
          }

          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      // Click to preview
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isResizing) {
          const event = new CustomEvent('image-preview', {
            detail: { src: node.attrs.src },
            bubbles: true,
            composed: true
          });
          editor.view.dom.dispatchEvent(event);
        }
      });

      return {
        dom: container,
        contentDOM: null,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          img.src = updatedNode.attrs.src;
          img.alt = updatedNode.attrs.alt || '';
          img.style.width = `${updatedNode.attrs.width}px`;
          return true;
        },
      };
    };
  },
});
