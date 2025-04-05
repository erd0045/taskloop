
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number) => Promise<boolean>;
  taskTitle: string;
  partnerName: string;
  isDoer: boolean;
  enforcedOpen?: boolean;
}

const RatingDialog: React.FC<RatingDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  taskTitle,
  partnerName,
  isDoer,
  enforcedOpen = false
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleRatingClick = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleMouseEnter = (hoveredIndex: number) => {
    setHoveredRating(hoveredIndex);
  };

  const handleMouseLeave = () => {
    setHoveredRating(0);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating before submitting.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const success = await onSubmit(rating);
      if (success) {
        toast({
          title: "Rating Submitted",
          description: "Thank you for your feedback!"
        });
        onClose();
      } else {
        toast({
          title: "Error",
          description: "Failed to submit rating. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If enforcedOpen is true, remove the ability to close the dialog
  const handleDialogChange = (open: boolean) => {
    if (!enforcedOpen && !open) {
      onClose();
    }
  };

  // Yellow for creators (when doer is rating), green for doers (when creator is rating)
  const starColor = isDoer ? "text-yellow-500 fill-current" : "text-green-500 fill-current";
  const emptyStarColor = "text-gray-300";

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rate {partnerName}</DialogTitle>
          <DialogDescription>
            Please rate {isDoer ? "the task creator" : "the doer"} for task "{taskTitle}"
            {enforcedOpen && (
              <p className="mt-2 text-red-500 font-semibold">
                Rating is required to complete this task
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          <div className="flex justify-center mb-4">
            {[1, 2, 3, 4, 5].map((index) => (
              <button
                key={index}
                className="p-1 focus:outline-none"
                onClick={() => handleRatingClick(index)}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
                disabled={isSubmitting}
              >
                <Star
                  className={`h-8 w-8 ${index <= (hoveredRating || rating) ? starColor : emptyStarColor}`}
                />
              </button>
            ))}
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            {rating === 0 ? 'Click to rate' : `You've selected ${rating} star${rating > 1 ? 's' : ''}`}
          </p>
        </div>
        
        <DialogFooter>
          {!enforcedOpen && (
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={rating === 0 || isSubmitting}>
            Submit Rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RatingDialog;
