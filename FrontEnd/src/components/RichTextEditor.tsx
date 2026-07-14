import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  Heading,
  Image,
  ImageCaption,
  ImageStyle,
  ImageToolbar,
  Italic,
  Link,
  List,
  Paragraph,
  Table,
  TableToolbar,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Shared HTML editor for product descriptions and content articles.
 * Images are uploaded through the existing product/content upload endpoint and
 * inserted as URLs, so the database only stores HTML and URL references.
 */
export const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung…',
  disabled = false,
}: RichTextEditorProps) => (
  <div className="rich-text-editor overflow-hidden rounded-2xl border border-slate-300 bg-white">
    <CKEditor
      editor={ClassicEditor}
      disabled={disabled}
      data={value}
      config={{
        licenseKey: 'GPL',
        plugins: [
          Essentials,
          Paragraph,
          Heading,
          Image,
          ImageCaption,
          ImageStyle,
          ImageToolbar,
          Bold,
          Italic,
          Link,
          List,
          BlockQuote,
          Table,
          TableToolbar,
        ],
        toolbar: [
          'undo', 'redo', '|',
          'heading', '|',
          'bold', 'italic', 'link', '|',
          'bulletedList', 'numberedList', '|',
          'insertTable', 'blockQuote',
        ],
        table: { contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells'] },
        image: {
          toolbar: [
            'toggleImageCaption', 'imageTextAlternative', '|',
            'imageStyle:inline', 'imageStyle:block', 'imageStyle:side',
          ],
        },
        placeholder,
      }}
      onChange={(_, editor) => onChange(editor.getData())}
    />
  </div>
);
