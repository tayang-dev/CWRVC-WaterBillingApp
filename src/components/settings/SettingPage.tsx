import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Check, Eye, EyeOff, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, {
      message: "Current password must be at least 6 characters.",
    }),
    newPassword: z.string().min(6, {
      message: "New password must be at least 6 characters.",
    }),
    confirmPassword: z.string().min(6, {
      message: "Confirm password must be at least 6 characters.",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const SettingsPage = () => {
  const { currentUser, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState("account");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleChangePassword = async (
    values: z.infer<typeof passwordSchema>
  ) => {
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const {
        updatePassword,
        EmailAuthProvider,
        reauthenticateWithCredential,
      } = await import("firebase/auth");
      const { auth } = await import("../../lib/firebase");

      const user = auth.currentUser;

      if (!user || !user.email) {
        throw new Error("User not found or email not available");
      }

      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        user.email,
        values.currentPassword
      );

      await reauthenticateWithCredential(user, credential);

      // Change password
      await updatePassword(user, values.newPassword);

      setSuccessMessage("Password changed successfully");
      form.reset();
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error.code === "auth/wrong-password") {
        setErrorMessage("Current password is incorrect");
      } else if (error.code === "auth/requires-recent-login") {
        setErrorMessage(
          "For security reasons, please log out and log back in before changing your password"
        );
      } else {
        setErrorMessage(error.message || "Failed to change password");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-500">
            Manage your account and security settings
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 flex justify-center space-x-4 border-b">
            <TabsTrigger value="account" className="px-4 py-2">
              Account
            </TabsTrigger>
            <TabsTrigger value="security" className="px-4 py-2">
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <Card className="shadow-md border">
              <CardHeader className="border-b px-6 py-4">
                <CardTitle className="text-xl font-semibold">
                  Account Information
                </CardTitle>
                <CardDescription className="text-gray-500">
                  View your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email" className="block mb-1">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      value={currentUser?.email || ""}
                      disabled
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role" className="block mb-1">
                      Role
                    </Label>
                    <Input
                      id="role"
                      value={userRole === "admin" ? "Administrator" : "Staff"}
                      disabled
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="shadow-md border">
              <CardHeader className="border-b px-6 py-4">
                <CardTitle className="text-xl font-semibold">
                  Change Password
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 py-4">
                {successMessage && (
                  <div className="flex items-center gap-2 mb-4 p-3 text-sm text-green-600 bg-green-50 rounded-md">
                    <Check className="h-4 w-4" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="flex items-center gap-2 mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleChangePassword)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <FormControl>
                              <Input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10"
                                {...field}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() =>
                                setShowCurrentPassword(!showCurrentPassword)
                              }
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <FormControl>
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10"
                                {...field}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <FormControl>
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="pl-10"
                                {...field}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Changing Password..." : "Change Password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
