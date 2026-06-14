import { toast as sonnerToast } from 'sonner';
import { AlertCircleIcon, CheckCircleIcon } from "lucide-react"

export const mytoast = Object.assign(
  (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
    return sonnerToast(message, {
        ...options,
        cancel: {
            label: 'Cancel',
            onClick: () => {},
        },
    });
  },
  {
    success: (message: string, options?: Parameters<typeof sonnerToast>[1]) =>
      sonnerToast.success('Success!', {
        ...options,
        icon: <CheckCircleIcon className="w-5 h-5 text-green-600" />,
        description: message,
        classNames: {
            title: '!text-green-600',
        },
        cancel: {
            label: 'Cancel',
            onClick: () => {},
        },
      }),
    error: (message: string, options?: Parameters<typeof sonnerToast>[1]) =>
      sonnerToast.error('Error:', {
        ...options,
        icon: <AlertCircleIcon className="w-5 h-5 text-red-600" />,
        description: message,
        classNames: {
            title: '!text-red-600',
        },
        cancel: {
            label: 'Cancel',
            onClick: () => {},
        },
      }),
    info: (message: string, options?: Parameters<typeof sonnerToast>[1]) =>
      sonnerToast.info(message, {
        ...options,
        cancel: {
            label: 'Cancel',
            onClick: () => {},
        },
      }),
    loading: (message: string, options?: Parameters<typeof sonnerToast>[1]) =>
      sonnerToast.loading(message, {
        ...options,
      }),
    // copy other methods you need
    dismiss: sonnerToast.dismiss,
  }
);
