
'use client';

import { Plus, MoreHorizontal, Search, Edit, Trash2, Shield, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Policy } from "@/types";
import { useState, useEffect } from "react";
import { deletePolicy } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useToast } from "../ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const PolicyManagement = ({ initialPolicies }: { initialPolicies: Policy[] }) => {
  const [policies, setPolicies] = useState<Policy[]>(initialPolicies);
  const [loading, setLoading] = useState(true);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setPolicies(initialPolicies);
    setLoading(false);
  }, [initialPolicies]);

  const confirmDelete = (policy: Policy) => {
    setPolicyToDelete(policy);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!policyToDelete) return;

    const result = await deletePolicy(policyToDelete.id);

    if (result.success) {
      toast({
        title: "Policy Deleted",
        description: `Successfully deleted "${policyToDelete.title}".`,
      });
      router.refresh();
    } else {
      toast({
        title: "Deletion Failed",
        description: result.error,
        variant: 'destructive',
      });
    }
    setIsAlertOpen(false);
    setPolicyToDelete(null);
  };
  
  if (loading) {
    return <div className="text-center p-8"><Loader2 className="w-6 h-6 animate-spin inline-block"/> Loading policies...</div>
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield />
            Company Policies
          </h2>
          <div className="flex space-x-3">
            <Link href="/admin/policies/create">
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors">
                <Plus className="w-4 h-4" />
                <span>Add Policy</span>
              </button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by policy title..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Last Updated</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{policy.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(policy.lastUpdated).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-full hover:bg-gray-700">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/policies/${policy.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                              <Edit className="w-4 h-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => confirmDelete(policy)} className="flex items-center gap-2 text-red-400 cursor-pointer focus:bg-red-900/50 focus:text-red-300">
                            <Trash2 className="w-4 h-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the policy: 
              <code className="font-mono bg-gray-700 rounded-sm px-1 mx-1">{policyToDelete?.title}</code>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Yes, delete policy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
