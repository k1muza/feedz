

'use client';

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Search, Edit, Trash2, Users, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { TeamMember } from "@/types";
import { deleteTeamMember } from "@/app/actions";
import { useToast } from "../ui/use-toast";
import { TeamFormModal } from "./TeamFormModal";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export const TeamManagement = ({ initialMembers }: { initialMembers: TeamMember[] }) => {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  
  const fetchMembers = () => {
    // This function would typically refetch from the server.
    // For now, we'll just re-trigger a refresh from Next.js cache.
    router.refresh();
  }

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
  };

  const handleSaveSuccess = () => {
    handleModalClose();
    fetchMembers();
    toast({
      title: "Success!",
      description: `Team member has been ${selectedMember ? 'updated' : 'added'}.`,
    });
  };
  
  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  }

  const confirmDelete = (member: TeamMember) => {
    setMemberToDelete(member);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!memberToDelete) return;
    const result = await deleteTeamMember(memberToDelete.id);
    if (result.success) {
      toast({ title: "Success", description: "Team member has been deleted." });
      fetchMembers();
    } else {
      toast({ title: "Error", description: result.error, variant: 'destructive' });
    }
    setIsAlertOpen(false);
    setMemberToDelete(null);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users />
              Team Management
          </h2>
          <div className="flex space-x-3">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <Image className="h-10 w-10 rounded-full object-cover" src={member.image} alt={member.name} width={40} height={40} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{member.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                       <div className="text-sm text-gray-400">{member.role}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-full hover:bg-gray-700">
                            <MoreHorizontal className="w-5 h-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white">
                          <DropdownMenuItem onClick={() => handleEdit(member)} className="flex items-center gap-2 cursor-pointer">
                            <Edit className="w-4 h-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => confirmDelete(member)} className="flex items-center gap-2 text-red-400 cursor-pointer focus:bg-red-900/50 focus:text-red-300">
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

      <TeamFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveSuccess}
        member={selectedMember}
      />
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team member: 
              <span className="font-bold text-white mx-1">{memberToDelete?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-500">
              Yes, delete member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
