import { toast } from "@/hooks/use-toast";

export const showSuccessNotification = (title: string, description?: string) => {
  toast({
    title,
    description,
  });
};

export const showErrorNotification = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: "destructive",
  });
};

export const showInfoNotification = (title: string, description?: string) => {
  toast({
    title,
    description,
  });
};

export const showLoadingNotification = (title: string, description?: string) => {
  toast({
    title,
    description,
  });
};

export const showWarningNotification = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: "destructive",
  });
};
