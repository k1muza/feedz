import { CheckCircle, X } from "lucide-react";
import toast from "react-hot-toast";

export const showSuccessToast = ({ message }: { message: string }) => {
  toast.custom((t) => (
    <div
      className={`${t.visible ? 'animate-enter' : 'animate-leave'}
       bg-gray-800 shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-green-500/30`}
    >
      <div className="flex items-center p-4">
        <div className="flex-shrink-0 h-5 w-5 text-green-400">
          <CheckCircle />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-100">Formulation Optimized!</p>
          <p className="mt-1 text-sm text-gray-300">
            {message}
          </p>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="ml-4 flex-shrink-0 rounded-md bg-gray-700 hover:bg-gray-600 inline-flex text-gray-400 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 p-1.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  ))
};