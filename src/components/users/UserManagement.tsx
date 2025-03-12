import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, Filter, Eye, Check, X, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  imageName: string;      // Full URL for profile image
  idImageUrl: string;     // Full URL for ID document
  selfieImageUrl: string; // Full URL for selfie image
  consumerAccounts: string[];
  verificationStatus: "pending" | "verified" | "rejected";
  verified: boolean;
  uploaded: boolean;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isVerificationDialogOpen, setIsVerificationDialogOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"verified" | "rejected">("verified");
  const [verificationNote, setVerificationNote] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all-users");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { collection, getDocs, query, orderBy } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      console.log("Fetching users from Firestore...");
      const usersQuery = query(collection(db, "users"), orderBy("lastName"));
      const usersSnapshot = await getDocs(usersQuery);

      if (usersSnapshot.empty) {
        console.warn("No users found in Firestore.");
      }

      const usersList: User[] = usersSnapshot.docs.map((doc) => {
        const userData = doc.data();
        return {
          id: doc.id,
          firstName: userData.firstName || "Unknown",
          lastName: userData.lastName || "Unknown",
          email: userData.email || "No Email",
          phone: userData.phone || "No Phone",
          dateOfBirth: userData.dateOfBirth || "Unknown DOB",
          imageName: userData.imageName || "",
          // Here we expect full URLs, same as profile image URL.
          idImageUrl: userData.idImageUrl || "",
          selfieImageUrl: userData.selfieImageUrl || "",
          consumerAccounts: userData.consumerAccounts || [],
          verificationStatus: userData.verification ? "verified" : "pending",
          verified: userData.verification || false,
          uploaded: userData.uploaded || false,
        };
      });

      console.log("Fetched users:", usersList);
      setUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert(`Failed to fetch users: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewUserDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsDialogOpen(true);
  };

  const handleVerifyUser = (user: User) => {
    setSelectedUser(user);
    setVerificationStatus("verified");
    setVerificationNote("");
    setIsVerificationDialogOpen(true);
  };

  const handleSubmitVerification = async () => {
    if (!selectedUser) return;
    try {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("../../lib/firebase");

      await updateDoc(doc(db, "users", selectedUser.id), {
        verificationStatus: verificationStatus,
        verified: verificationStatus === "verified",
        verification: verificationStatus === "verified",
        verificationNote: verificationNote,
        verifiedAt: new Date().toISOString(),
      });

      // If verified, update any linked consumer accounts
      if (verificationStatus === "verified" && selectedUser.consumerAccounts?.length > 0) {
        const { collection, query, where, getDocs, updateDoc } = await import("firebase/firestore");

        for (const accountNumber of selectedUser.consumerAccounts) {
          try {
            const accountsQuery = query(
              collection(db, "customers"),
              where("accountNumber", "==", accountNumber)
            );
            const accountsSnapshot = await getDocs(accountsQuery);

            if (!accountsSnapshot.empty) {
              const accountDoc = accountsSnapshot.docs[0];
              await updateDoc(doc(db, "customers", accountDoc.id), {
                userId: selectedUser.id,
                userVerified: true,
                verifiedAt: new Date().toISOString(),
              });
            }
          } catch (accountError) {
            console.error(`Error updating account ${accountNumber}:`, accountError);
          }
        }
      }

      setUsers(
        users.map((user) =>
          user.id === selectedUser.id
            ? {
                ...user,
                verificationStatus: verificationStatus,
                verified: verificationStatus === "verified",
                verification: verificationStatus === "verified",
              }
            : user
        )
      );

      setIsVerificationDialogOpen(false);
      setSelectedUser(null);
      setVerificationStatus("verified");
      setVerificationNote("");
    } catch (error) {
      console.error("Error updating user verification:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to update verification status: ${errorMessage}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Pending
          </Badge>
        );
      case "verified":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchTerm === "" ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm) ||
      (user.consumerAccounts && user.consumerAccounts.some((account) => account.includes(searchTerm)));
    const matchesStatus = statusFilter === "all" || user.verificationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingUsers = users.filter((user) => user.verificationStatus === "pending");

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-800">User Management</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="all-users">All Users</TabsTrigger>
            <TabsTrigger value="pending-verification">
              Pending Verification {pendingUsers.length > 0 && `(${pendingUsers.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Accounts</CardTitle>
                <CardDescription>Manage user accounts and verification status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4 mb-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-grow">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by name, email, phone or account number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-40">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
                        }}
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <p>Loading users...</p>
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Account Numbers</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center space-x-3">
                                  <Avatar>
                                    <AvatarImage
                                      src={user.imageName}
                                      alt={`${user.firstName} ${user.lastName}`}
                                    />
                                    <AvatarFallback>
                                      {user.firstName[0]}
                                      {user.lastName[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>
                                    {user.firstName} {user.lastName}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{user.phone}</TableCell>
                              <TableCell>
                                {user.consumerAccounts && user.consumerAccounts.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {user.consumerAccounts.map((account, index) => (
                                      <Badge key={index} variant="outline" className="bg-blue-50">
                                        {account}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-500">No accounts</span>
                                )}
                              </TableCell>
                              <TableCell>{getStatusBadge(user.verificationStatus)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" size="sm" onClick={() => handleViewUserDetails(user)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Details
                                  </Button>
                                  {user.verificationStatus === "pending" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleVerifyUser(user)}
                                      className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    >
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      Verify
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                              No users found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending-verification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Verification</CardTitle>
                <CardDescription>Users waiting for account verification</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <p>Loading users...</p>
                  </div>
                ) : pendingUsers.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Account Numbers</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarImage
                                    src={user.imageName}
                                    alt={`${user.firstName} ${user.lastName}`}
                                  />
                                  <AvatarFallback>
                                    {user.firstName[0]}
                                    {user.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span>
                                  {user.firstName} {user.lastName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.phone}</TableCell>
                            <TableCell>
                              {user.consumerAccounts && user.consumerAccounts.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {user.consumerAccounts.map((account, index) => (
                                    <Badge key={index} variant="outline" className="bg-blue-50">
                                      {account}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-500">No accounts</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" size="sm" onClick={() => handleViewUserDetails(user)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Details
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerifyUser(user)}
                                  className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Verify
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md border border-gray-200">
                    <div className="text-center">
                      <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        No Pending Verifications
                      </h3>
                      <p className="text-gray-500">All user accounts have been verified</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>View detailed information about this user</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="grid gap-6">
                <div className="flex flex-col items-center space-y-3">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={selectedUser.imageName}
                      alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                    />
                    <AvatarFallback className="text-2xl">
                      {selectedUser.firstName[0]}
                      {selectedUser.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h3>
                    <p className="text-gray-500">{selectedUser.email}</p>
                    {getStatusBadge(selectedUser.verificationStatus)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Phone Number</Label>
                    <p className="font-medium">{selectedUser.phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Date of Birth</Label>
                    <p className="font-medium">{selectedUser.dateOfBirth}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Account Numbers</Label>
                  {selectedUser.consumerAccounts && selectedUser.consumerAccounts.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedUser.consumerAccounts.map((account, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                          {account}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No accounts linked</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">ID Document</Label>
                    <div className="mt-1 h-40 bg-gray-100 rounded-md flex items-center justify-center">
                      {selectedUser.idImageUrl ? (
                        <img
                          src={selectedUser.idImageUrl}
                          alt="ID Document"
                          className="max-h-full max-w-full object-contain rounded-md"
                        />
                      ) : (
                        <p className="text-gray-500">No ID document uploaded</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Selfie Verification</Label>
                    <div className="mt-1 h-40 bg-gray-100 rounded-md flex items-center justify-center">
                      {selectedUser.selfieImageUrl ? (
                        <img
                          src={selectedUser.selfieImageUrl}
                          alt="Selfie Verification"
                          className="max-h-full max-w-full object-contain rounded-md"
                        />
                      ) : (
                        <p className="text-gray-500">No selfie uploaded</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDetailsDialogOpen(false); setSelectedUser(null); }}>
                Close
              </Button>
              {selectedUser && selectedUser.verificationStatus === "pending" && (
                <Button
                  onClick={() => {
                    setIsDetailsDialogOpen(false);
                    handleVerifyUser(selectedUser);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Verify User
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Verification Dialog */}
        <Dialog open={isVerificationDialogOpen} onOpenChange={setIsVerificationDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Verify User Account</DialogTitle>
              <DialogDescription>
                Review user information and approve or reject their account verification
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="grid gap-4 py-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage
                      src={selectedUser.imageName}
                      alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                    />
                    <AvatarFallback>
                      {selectedUser.firstName[0]}
                      {selectedUser.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Account Numbers</Label>
                  {selectedUser.consumerAccounts && selectedUser.consumerAccounts.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedUser.consumerAccounts.map((account, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                          {account}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No accounts linked</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">ID Document</Label>
                    <div className="mt-1 h-32 bg-gray-100 rounded-md flex items-center justify-center">
                      {selectedUser.idImageUrl ? (
                        <img
                          src={selectedUser.idImageUrl}
                          alt="ID Document"
                          className="max-h-full max-w-full object-contain rounded-md"
                        />
                      ) : (
                        <p className="text-gray-500">No ID document</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Selfie Verification</Label>
                    <div className="mt-1 h-32 bg-gray-100 rounded-md flex items-center justify-center">
                      {selectedUser.selfieImageUrl ? (
                        <img
                          src={selectedUser.selfieImageUrl}
                          alt="Selfie Verification"
                          className="max-h-full max-w-full object-contain rounded-md"
                        />
                      ) : (
                        <p className="text-gray-500">No selfie</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="verification-status">Verification Decision</Label>
                  <div className="flex gap-4 mt-1">
                    <Button
                      type="button"
                      variant={verificationStatus === "verified" ? "default" : "outline"}
                      className={verificationStatus === "verified" ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => setVerificationStatus("verified")}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      type="button"
                      variant={verificationStatus === "rejected" ? "default" : "outline"}
                      className={verificationStatus === "rejected" ? "bg-red-600 hover:bg-red-700" : ""}
                      onClick={() => setVerificationStatus("rejected")}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
                <div className="mt-2">
                  <Label htmlFor="verification-note">Note (Optional)</Label>
                  <Textarea
                    id="verification-note"
                    placeholder="Add a note about this verification decision..."
                    value={verificationNote}
                    onChange={(e) => setVerificationNote(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsVerificationDialogOpen(false); setSelectedUser(null); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitVerification}
                className={verificationStatus === "verified" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              >
                {verificationStatus === "verified" ? "Approve User" : "Reject User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserManagement;
