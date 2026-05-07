import React from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link2,
  Undo2,
  Redo2,
} from 'lucide-react'

function ToolbarButton({
  onClick,
  active = false,
  disabled,
  title,
  children,
}: {
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      /* Evita que o editor perca a seleção antes do comando (títulos, listas, etc.). */
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded px-2 py-1.5 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 ${
        active ? 'bg-indigo-100 text-indigo-900' : ''
      }`}
    >
      {children}
    </button>
  )
}

export default function MentorNoteRichTextEditor({
  initialContent = '',
  onChange,
  placeholder = 'Escreva a mensagem… Use a barra para negrito, títulos e listas.',
  disabled = false,
  contentClassName = '',
}: {
  initialContent?: string
  onChange?: (html: string) => void
  placeholder?: string
  disabled?: boolean
  contentClassName?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-700 underline decoration-indigo-300 hover:text-indigo-900',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent || '',
    editable: !disabled,
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML())
    },
  })

  React.useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [editor, disabled])

  if (!editor) {
    return (
      <div className="min-h-[140px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
        A carregar editor…
      </div>
    )
  }

  const setLink = () => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('Endereço do link (https://…)', prev || 'https://')
    if (url === null) return
    const t = url.trim()
    if (t === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: t }).run()
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white">
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1 py-1"
        role="toolbar"
        aria-label="Formatação"
      >
        <ToolbarButton
          title="Negrito"
          active={editor.isActive('bold')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Itálico"
          active={editor.isActive('italic')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Sublinhado"
          active={editor.isActive('underline')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Riscado"
          active={editor.isActive('strike')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:inline" aria-hidden />
        <ToolbarButton
          title="Título secção"
          active={editor.isActive('heading', { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Subtítulo"
          active={editor.isActive('heading', { level: 3 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:inline" aria-hidden />
        <ToolbarButton
          title="Lista com marcas"
          active={editor.isActive('bulletList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Lista numerada"
          active={editor.isActive('orderedList')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Citação"
          active={editor.isActive('blockquote')}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Linha horizontal"
          disabled={disabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Link"
          active={editor.isActive('link')}
          disabled={disabled}
          onClick={setLink}
        >
          <Link2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:inline" aria-hidden />
        <ToolbarButton
          title="Desfazer"
          disabled={disabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Refazer"
          disabled={disabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" aria-hidden />
        </ToolbarButton>
      </div>
      <EditorContent
        editor={editor}
        className={`mentor-tiptap-editor max-h-[min(24rem,50vh)] overflow-y-auto px-3 py-2 ${contentClassName}`.trim()}
      />
    </div>
  )
}
