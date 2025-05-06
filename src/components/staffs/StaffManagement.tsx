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
              
              alert("User already exists in the system. Added to staff with current details.");
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

  const filteredStaffs = staffs.filter(
    (staff) =>
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Staff Management</h2>
        <div className="flex space-x-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search staff..."
              className="pl-10 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              setEditingStaff(null); // Reset editingStaff to null
              setFormData({ name: "", email: "", password: "", role: "staff", status: "active" }); // Reset form data
              setError(""); // Clear any previous errors
              setIsDialogOpen(true); // Open the dialog
            }}
          >
            Add Staff
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-100 text-blue-800">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaffs.length > 0 ? (
              filteredStaffs.map((staff) => (
                <TableRow key={staff.id} className="hover:bg-gray-50">
                  <TableCell>{staff.name}</TableCell>
                  <TableCell>{staff.email}</TableCell>
                  <TableCell className="capitalize">
                    {staff.role.replace("_", " ")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        staff.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {staff.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingStaff(staff);
                            setFormData({ ...staff, password: "" });
                            setError(""); // Clear any previous errors
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteStaff(staff.id, staff.uid, staff.email)}
                          className="text-red-600 focus:text-red-600"
                          disabled={isDeleting}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                  No staff found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-blue-700">
              {editingStaff ? "Edit Staff" : "Add Staff"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <Input
              name="name"
              placeholder="Name"
              value={formData.name}
              onChange={handleInputChange}
            />
            <Input
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
            />
            {!editingStaff && (
              <Input
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
              >
                <option value="staff">Staff</option>
                <option value="meter_reader">Meter Reader</option>
              </select>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full border rounded px-3 py-2"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            {error && (
              <div className="text-red-500 text-sm py-2">
                {error}
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleSaveStaff}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : (editingStaff ? "Update" : "Save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;