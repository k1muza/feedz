'use client';

import { Plus, Download, MoreHorizontal, Search, Filter, Edit, Trash2, Eye, FolderOpen, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { BlogPost } from "@/types";
import { getAllBlogPosts, updatePostFeaturedStatus, deleteBlogPost } from "@/app/actions";
import { Switch } from "../ui/switch";
import { useToast } from "../ui/use-toast";
import { CategoryManagementModal } from "./CategoryManagementModal";
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
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from "../ui/pagination";

export const BlogManagement = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof BlogPost; direction: 'asc' | 'desc' } | null>(null);
  const [filteredCategory, setFilteredCategory] = useState<string | null>(null);
  const { toast } = useToast();

  const itemsPerPage = 8;
  const categories = Array.from(new Set(posts.map(post => post.category)));

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const allPosts = await getAllBlogPosts();
      setPosts(allPosts);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  const handleFeatureToggle = async (postId: string, isFeatured: boolean) => {
    try {
      const result = await updatePostFeaturedStatus(postId, isFeatured);
      if (result.success) {
        toast({
          title: "Success!",
          description: `Post has been ${isFeatured ? 'featured' : 'unfeatured'}.`
        });
        // Optimistically update UI
        setPosts(posts.map(post => 
          post.id === postId ? { ...post, featured: isFeatured } : post
        ));
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update featured status",
        variant: "destructive"
      });
    }
  };

  const confirmDelete = (post: BlogPost) => {
    setPostToDelete(post);
    setIsAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!postToDelete) return;
    
    try {
      const result = await deleteBlogPost(postToDelete.id);
      if (result.success) {
        toast({ title: "Success", description: `Post "${postToDelete.title}" deleted.` });
        setPosts(posts.filter(post => post.id !== postToDelete.id));
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete post", variant: 'destructive' });
    } finally {
      setIsAlertOpen(false);
      setPostToDelete(null);
    }
  };

  const handleSort = (key: keyof BlogPost) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortedPosts = () => {
    if (!sortConfig) return posts;
    
    return [...posts].sort((a, b) => {
      // Handle date sorting differently
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      }
      
      // Handle author name sorting
      if (sortConfig.key === 'author') {
        const nameA = a.author.name.toLowerCase();
        const nameB = b.author.name.toLowerCase();
        if (nameA < nameB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (nameA > nameB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }
      
      // Default sorting for other fields
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getFilteredPosts = () => {
    let result = getSortedPosts();
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(post => 
        post.title.toLowerCase().includes(term) || 
        post.author.name.toLowerCase().includes(term))
    }
    
    // Apply category filter
    if (filteredCategory) {
      result = result.filter(post => post.category === filteredCategory);
    }
    
    return result;
  };

  const filteredPosts = getFilteredPosts();
  const pageCount = Math.ceil(filteredPosts.length / itemsPerPage);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, pageCount)));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Skeleton className="h-8 w-48 bg-gray-800" />
          <div className="flex space-x-3">
            <Skeleton className="h-10 w-48 bg-gray-800" />
            <Skeleton className="h-10 w-32 bg-gray-800" />
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <Skeleton className="h-10 flex-1 bg-gray-800" />
          <Skeleton className="h-10 w-32 bg-gray-800" />
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-900">
                <TableRow className="bg-gray-900 hover:bg-gray-900">
                  {[...Array(6)].map((_, i) => (
                    <TableHead key={i} className="bg-gray-900">
                      <Skeleton className="h-4 w-24 bg-gray-800" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody className="bg-gray-950">
                {[...Array(5)].map((_, rowIndex) => (
                  <TableRow key={rowIndex} className="bg-gray-900 border-gray-800 hover:bg-gray-900">
                    {[...Array(6)].map((_, cellIndex) => (
                      <TableCell key={cellIndex} className="bg-gray-900">
                        <Skeleton className="h-4 w-full bg-gray-800" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-white">
            Blog Posts
            <span className="text-gray-400 text-base font-normal ml-2">
              ({filteredPosts.length} posts)
            </span>
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Button 
              variant="outline"
              onClick={() => setIsCategoryModalOpen(true)}
              className="gap-2 bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800 hover:text-white"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Manage Categories</span>
            </Button>
            <Link href="/admin/blog/create">
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-500">
                <Plus className="w-4 h-4" />
                <span>Add Post</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by post title or author..."
              className="pl-10 bg-gray-900 text-gray-200 border-gray-700 focus:border-indigo-500 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2 bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800 hover:text-white"
              >
                <Filter className="w-4 h-4" />
                <span>
                  {filteredCategory ? `Category: ${filteredCategory}` : "Filter by Category"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-gray-900 border-gray-700 text-gray-200">
              <DropdownMenuItem 
                className="cursor-pointer hover:bg-gray-800"
                onClick={() => setFilteredCategory(null)}
              >
                All Categories
              </DropdownMenuItem>
              {categories.map(category => (
                <DropdownMenuItem 
                  key={category} 
                  className="cursor-pointer capitalize hover:bg-gray-800"
                  onClick={() => {
                    setFilteredCategory(category);
                    setCurrentPage(1);
                  }}
                >
                  {category}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Posts Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-900">
                <TableRow className="hover:bg-gray-900">
                  <TableHead 
                    className="cursor-pointer text-gray-300 hover:text-white bg-gray-900"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      <span>Post</span>
                      {sortConfig?.key === 'title' && (
                        sortConfig.direction === 'asc' 
                          ? <ChevronUp className="ml-1 w-4 h-4" /> 
                          : <ChevronDown className="ml-1 w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer text-gray-300 hover:text-white bg-gray-900"
                    onClick={() => handleSort('author')}
                  >
                    <div className="flex items-center">
                      <span>Author</span>
                      {sortConfig?.key === 'author' && (
                        sortConfig.direction === 'asc' 
                          ? <ChevronUp className="ml-1 w-4 h-4" /> 
                          : <ChevronDown className="ml-1 w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer text-gray-300 hover:text-white bg-gray-900"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center">
                      <span>Category</span>
                      {sortConfig?.key === 'category' && (
                        sortConfig.direction === 'asc' 
                          ? <ChevronUp className="ml-1 w-4 h-4" /> 
                          : <ChevronDown className="ml-1 w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer text-gray-300 hover:text-white bg-gray-900"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      <span>Date</span>
                      {sortConfig?.key === 'date' && (
                        sortConfig.direction === 'asc' 
                          ? <ChevronUp className="ml-1 w-4 h-4" /> 
                          : <ChevronDown className="ml-1 w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-gray-300 bg-gray-900">Featured</TableHead>
                  <TableHead className="text-right text-gray-300 bg-gray-900">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-gray-950">
                {paginatedPosts.length > 0 ? paginatedPosts.map((post) => (
                  <TableRow key={post.id} className="border-gray-800 hover:bg-gray-900 transition-colors">
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <Image 
                            className="h-10 w-10 rounded-md object-cover border border-gray-700" 
                            src={post.image} 
                            alt={post.title} 
                            width={40} 
                            height={40} 
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white line-clamp-1">{post.title}</div>
                          <div className="text-xs text-gray-400 mt-1 line-clamp-1">{post.excerpt}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <Image 
                            className="h-8 w-8 rounded-full object-cover border border-gray-700" 
                            src={post.author.image} 
                            alt={post.author.name} 
                            width={32} 
                            height={32} 
                          />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm text-white">{post.author.name}</div>
                          <div className="text-xs text-gray-400">{post.author.role}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="capitalize bg-gray-800 text-indigo-300 border-indigo-900">
                        {post.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-gray-300">
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="py-3">
                      <Switch
                          checked={post.featured}
                          onCheckedChange={(checked) => handleFeatureToggle(post.id, checked)}
                          aria-label="Toggle featured post"
                          className="data-[state=checked]:bg-indigo-500"
                      />
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                            <MoreHorizontal className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 text-gray-200 w-48">
                          <DropdownMenuItem asChild className="hover:bg-gray-800">
                            <Link 
                              href={`/blog/${post.slug}`} 
                              target="_blank" 
                              className="flex items-center gap-2 cursor-pointer px-4 py-2"
                            >
                              <Eye className="w-4 h-4 text-indigo-400" /> 
                              <span>View Live</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="hover:bg-gray-800">
                            <Link 
                              href={`/admin/blog/${post.slug}/edit`} 
                              className="flex items-center gap-2 cursor-pointer px-4 py-2"
                            >
                              <Edit className="w-4 h-4 text-yellow-400" /> 
                              <span>Edit</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => confirmDelete(post)} 
                            className="flex items-center gap-2 text-red-400 cursor-pointer px-4 py-2 hover:bg-red-900/30"
                          >
                            <Trash2 className="w-4 h-4" /> 
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow className="bg-gray-900 border-gray-800 hover:bg-gray-900">
                    <TableCell colSpan={6} className="text-center py-12 bg-gray-950">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="w-12 h-12 text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-gray-300">No posts found</h3>
                        <p className="text-gray-500 mt-2">
                          {searchTerm 
                            ? `No posts match your search for "${searchTerm}"` 
                            : "Create your first post to get started"}
                        </p>
                        {!searchTerm && (
                          <Link href="/admin/blog/create" className="mt-4">
                            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-500">
                              <Plus className="w-4 h-4" />
                              Create Post
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {pageCount > 1 && (
            <div className="border-t border-gray-800 p-4 bg-gray-900">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={cn(
                        "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white",
                        currentPage === 1 && "opacity-50 cursor-not-allowed"
                      )}
                    />
                  </PaginationItem>
                  
                  <div className="text-sm text-gray-400 mx-4">
                    Page {currentPage} of {pageCount}
                  </div>
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === pageCount}
                      className={cn(
                        "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white",
                        currentPage === pageCount && "opacity-50 cursor-not-allowed"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>
      
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Post?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete the post: 
              <span className="text-white font-medium ml-1">"{postToDelete?.title}"</span>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-500 focus:ring-red-500 text-white"
            >
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
