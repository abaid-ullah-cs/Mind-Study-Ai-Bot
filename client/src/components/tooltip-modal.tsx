import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TooltipModalProps {
  term: string;
  definition: string;
  show: boolean;
  onClose: () => void;
}

export default function TooltipModal({ term, definition, show, onClose }: TooltipModalProps) {
  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            {term}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {definition}
          </p>
          <div className="mt-4 text-xs text-gray-500">
            Source: Educational Resources
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
