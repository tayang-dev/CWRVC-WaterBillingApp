import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  doc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  getAuth,
} from "firebase/auth";
import { db, auth } from "../../lib/firebase";

import { Button } from "../ui/button";
import { Eye, EyeOff } from "lucide-react"; 

import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Badge } from "../ui/badge";
import { Edit, Trash, MoreHorizontal, Search } from "lucide-react";

interface Staff {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

const StaffManagement = () => {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showPassword, setShowPassword] = useState(false); 

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff",
    status: "active",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  // State to toggle header color
  const [isBlueHeader, setIsBlueHeader] = useState(false);
  
  // Function to toggle header color
  const toggleHeaderColor = () => {
    setIsBlueHeader(prev => !prev);
  };

  useEffect(() => {
    const fetchStaffs = async () => {
      const staffCollection = collection(db, "staffs");
      const staffSnapshot = await getDocs(staffCollection);
      const staffList: Staff[] = staffSnapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Staff, "id">) }))
        .filter((staff) => staff.role !== "admin"); // Exclude admins
      setStaffs(staffList);
    };
    fetchStaffs();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear any previous errors when the user types
    if (error) setError("");
  };

  const handleSaveStaff = async () => {
    try {
      setIsLoading(true);
      setError("");

      if (editingStaff) {
        // Just update the Firestore document for existing staff
        const staffRef = doc(db, "staffs", editingStaff.id);
        await updateDoc(staffRef, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status
        });
        
        // Update local state
        setStaffs(staffs.map(staff => 
          staff.id === editingStaff.id 
            ? { ...staff, name: formData.name, email: formData.email, role: formData.role, status: formData.status } 
            : staff
        ));
      } else {
        // For new staff, check if the email already exists in Auth
        try {
          // Check if email already exists in our staff collection first
          const emailQuery = query(
            collection(db, "staffs"), 
            where("email", "==", formData.email)
          );
          const querySnapshot = await getDocs(emailQuery);
          
          if (!querySnapshot.empty) {
            // Email is already assigned to a staff member in our database
            throw new Error("This email is already used by another staff member in the system");
          }
          
          // Now try to create the user in Authentication
          if (!formData.password) {
            throw new Error("Password is required for new users");
          }
          // Require strong password: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
          const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
          if (!strongPasswordRegex.test(formData.password)) {
            throw new Error(
              "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
            );
          }
            
          try {
            // Try to create user in Auth
            const userCredential = await createUserWithEmailAndPassword(
              auth,
              formData.email,
              formData.password
            );
            const user = userCredential.user;
            
            // Successfully created Auth user, now create in Firestore
            const staffCollection = collection(db, "staffs");
            const docRef = await addDoc(staffCollection, {
              uid: user.uid,
              name: formData.name,
              email: formData.email,
              role: formData.role,
              status: formData.status,
            });
            
            // Add the new staff to local state
            setStaffs([...staffs, {
              id: docRef.id,
              uid: user.uid,
              name: formData.name,
              email: formData.email,
              role: formData.role,
              status: formData.status,
            }]);
            
          } catch (authError: any) {
            // Handle auth errors specifically
            if (authError.code === "auth/email-already-in-use") {
              // Email exists in Auth but not as a staff, add them as staff with a placeholder UID
              const staffCollection = collection(db, "staffs");
              const docRef = await addDoc(staffCollection, {
                uid: "existing-auth-user", // Placeholder UID
                name: formData.name,
                email: formData.email,
                role: formData.role,
                status: formData.status,
              });
              
              // Add the new staff to local state
              setStaffs([...staffs, {
                id: docRef.id,
                uid: "existing-auth-user",
                name: formData.name,
                email: formData.email,
                role: formData.role,
                status: formData.status,
              }]);
              
              alert("Staff is successfully added to the system.");
            } else if (authError.code === "auth/invalid-email") {
              throw new Error("Please enter a valid email address.");
            } else if (authError.code === "auth/weak-password") {
              throw new Error("Password is too weak. Please use at least 6 characters.");
            } else {
              throw authError; // Rethrow any other auth errors
            }
          }
        } catch (error: any) {
          console.error("Error checking or creating user:", error);
          // Provide a meaningful error message
          if (error.message) {
            throw error; // Use the already formatted error
          } else {
            throw new Error("An unexpected error occurred. Please try again.");
          }
        }
      }
      
      // Reset form
      setIsDialogOpen(false);
      setEditingStaff(null);
      setFormData({ name: "", email: "", password: "", role: "staff", status: "active" });
      
    } catch (error: any) {
      console.error("Error saving staff:", error);
      setError(error.message || "An error occurred while saving the staff member");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string, uid: string, email: string) => {
    try {
      // Prevent multiple deletion attempts
      if (isDeleting) return;
      setIsDeleting(true);
      
      // Show a confirmation prompt
      const confirmDelete = window.confirm("Are you sure you want to delete this staff member?");
      if (!confirmDelete) {
        setIsDeleting(false);
        return; // Exit if the user cancels
      }

      // Only delete the document from Firestore - don't attempt to delete Auth user
      const staffRef = doc(db, "staffs", id);
      await deleteDoc(staffRef);

      // Update the state to remove the deleted staff from the list
      setStaffs((prev) => prev.filter((staff) => staff.id !== id));
      alert("Staff member deleted successfully from the system.");
      
    } catch (error) {
      console.error("Error deleting staff member:", error);
      alert("An error occurred while deleting the staff member. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to display the role correctly in the UI
  const displayRole = (role: string) => {
    // Display "cashier" in the UI when the role is "staff"
    if (role === "staff") {
      return "Cashier";
    }
    // Keep other roles as is, with formatting
    return role.replace("_", " ");
  };

  const filteredStaffs = staffs.filter(
    (staff) =>
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 bg-white rounded-xl shadow-md">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">Manage your team members and their access</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
            <Input
              placeholder="Search by name or email..."
              className="pl-10 w-full pr-4 py-2 border-blue-100 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2"
            onClick={() => {
              setEditingStaff(null);
              setFormData({ name: "", email: "", password: "", role: "staff", status: "active" });
              setError("");
              setIsDialogOpen(true);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Staff
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 text-blue-600 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Staff</p>
              <h3 className="text-2xl font-bold text-gray-900">{staffs.length}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-r from-green-100 to-green-200 text-green-600 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Active Staff</p>
              <h3 className="text-2xl font-bold text-green-600">{staffs.filter(staff => staff.status === 'active').length}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-r from-red-100 to-red-200 text-red-600 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Inactive Staff</p>
              <h3 className="text-2xl font-bold text-red-600">{staffs.filter(staff => staff.status === 'inactive').length}</h3>
            </div>
          </div>
        </div>
      </div>
      
      {/* Table with clickable header to toggle color */}
      <div className="bg-white border border-blue-100 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow 
                className={`${isBlueHeader ? 'bg-blue-900' : 'bg-white border-b'} text-${isBlueHeader ? 'white' : 'gray-700'} transition-colors duration-300 cursor-pointer`}
                onClick={toggleHeaderColor}
              >
                <TableHead className="py-4 font-semibold text-sm md:text-base">
                  Name
                </TableHead>
                <TableHead className="py-4 font-semibold text-sm md:text-base">
                  Email
                </TableHead>
                <TableHead className="py-4 font-semibold text-sm md:text-base">
                  Role
                </TableHead>
                <TableHead className="py-4 font-semibold text-sm md:text-base">
                  Status
                </TableHead>
                <TableHead className="py-4 font-semibold text-sm md:text-base pl-8">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaffs.length > 0 ? (
                filteredStaffs.map((staff) => (
                  <TableRow key={staff.id} className="border-b border-blue-50 hover:bg-blue-50 transition-colors">
                    <TableCell className="py-4 font-medium text-gray-900">{staff.name}</TableCell>
                    <TableCell className="py-4 text-gray-700">{staff.email}</TableCell>
                    <TableCell className="py-4">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {displayRole(staff.role)}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        variant="outline"
                        className={
                          staff.status === "active"
                            ? "bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
                            : "bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium"
                        }
                      >
                        {staff.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 pl-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full hover:bg-blue-100">
                            <MoreHorizontal className="h-5 w-5 text-blue-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-lg shadow-lg border-blue-100">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingStaff(staff);
                              setFormData({ ...staff, password: "" });
                              setError("");
                              setIsDialogOpen(true);
                            }}
                            className="flex items-center p-3 hover:bg-blue-50 cursor-pointer"
                          >
                            <Edit className="mr-2 h-5 w-5 text-blue-600" />
                            <span className="font-medium">Edit</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteStaff(staff.id, staff.uid, staff.email)}
                            className="flex items-center p-3 hover:bg-red-50 text-red-600 cursor-pointer"
                            disabled={isDeleting}
                          >
                            <Trash className="mr-2 h-5 w-5" />
                            <span className="font-medium">Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span className="font-medium text-lg">No staff found</span>
                      <p className="text-gray-400 mt-1">Try adjusting your search or add new staff members</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl">
          <div className={`${isBlueHeader ? 'bg-blue-900' : 'bg-white border-b border-gray-200'} p-6 transition-colors duration-300`}>
            <DialogHeader>
              <DialogTitle className={`text-xl font-bold ${isBlueHeader ? 'text-white' : 'text-blue-900'}`}>
                {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
              </DialogTitle>
              <p className={`${isBlueHeader ? 'text-blue-100' : 'text-gray-500'} mt-1`}>
                {editingStaff ? "Update information for this team member" : "Enter details to create a new team member"}
              </p>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </div>
              
              {!editingStaff && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters and include uppercase, lowercase, number, and special character.</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2"
                  >
                    <option value="staff">Cashier</option>
                    <option value="meter_reader">Meter Reader</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50 p-2"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="text-red-500 text-sm py-2 px-3 bg-red-50 border border-red-100 rounded-lg flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                className={`${isBlueHeader ? 'bg-blue-600' : 'bg-blue-500'} hover:opacity-90 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-all duration-200`}
                onClick={handleSaveStaff}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </div>
                ) : (
                  editingStaff ? "Update Staff" : "Add Staff"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;