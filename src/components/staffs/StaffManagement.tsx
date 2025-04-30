import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  deleteUser,
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
  };

  const handleSaveStaff = async () => {
    if (editingStaff) {
      const staffRef = doc(db, "staffs", editingStaff.id);
      await updateDoc(staffRef, { ...formData });
    } else {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        const user = userCredential.user;
        const staffCollection = collection(db, "staffs");
        await addDoc(staffCollection, {
          uid: user.uid,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
        });
      } catch (error) {
        console.error("Error creating user:", error);
      }
    }
    setIsDialogOpen(false);
    setEditingStaff(null);
    setFormData({ name: "", email: "", password: "", role: "staff", status: "active" });
  };

  const handleDeleteStaff = async (id: string, uid: string) => {
    try {
      const user = auth.currentUser;
      if (user && user.uid === uid) {
        await deleteUser(user);
      }
      const staffRef = doc(db, "staffs", id);
      await deleteDoc(staffRef);
      setStaffs((prev) => prev.filter((staff) => staff.id !== id));
    } catch (error) {
      console.error("Error deleting user:", error);
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
            onClick={() => setIsDialogOpen(true)}
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
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteStaff(staff.id, staff.uid)}
                          className="text-red-600 focus:text-red-600"
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
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleSaveStaff}
            >
              {editingStaff ? "Update" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;
