
import React from 'react';
import { FileIcon, FileTextIcon, ImageIcon, XIcon } from 'lucide-react';
import type { FileAttachment } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface FileAttachmentProps {
  file: FileAttachment;
  isPreview?: boolean;
  onRemove?: () => void;
}

const FileAttachmentDisplay: React.FC<FileAttachmentProps> = ({
  file,
  isPreview = false,
  onRemove,
}) => {
  const getFileIcon = () => {
    const fileType = file.type.split('/')[0];
    const fileExtension = file.type.split('/')[1];
    
    if (fileType === 'image') {
      return <ImageIcon className="h-5 w-5" />;
    } else if (fileExtension === 'pdf') {
      return <FileTextIcon className="h-5 w-5" />;
    } else {
      return <FileIcon className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
  };

  // If it's an image and not in preview mode, show the image
  if (file.type.startsWith('image/') && !isPreview) {
    return (
      <div className="relative mt-2 max-w-[200px]">
        <img src={file.url} alt={file.name} className="rounded-md max-w-full" />
        <div className="text-xs text-gray-500 mt-1">{file.name} ({formatFileSize(file.size)})</div>
      </div>
    );
  }

  return (
    <div className={`flex items-center p-2 bg-muted/50 rounded-md mt-2 ${isPreview ? 'w-full' : 'max-w-[200px]'}`}>
      <div className="mr-2">{getFileIcon()}</div>
      <div className="flex-1 truncate">
        <div className="text-sm font-medium truncate">{file.name}</div>
        <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
      </div>
      {isPreview && onRemove && (
        <Button variant="ghost" size="icon" onClick={onRemove} className="h-6 w-6">
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default FileAttachmentDisplay;
