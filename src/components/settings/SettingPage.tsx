import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  FormDescription,
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
    values: z.infer<typeof passwordSchema>,
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
        values.currentPassword,
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
          "For security reasons, please log out and log back in before changing your password",
        );
      } else {
        setErrorMessage(error.message || "Failed to change password");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-full bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
          <p className="text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  View and update your account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={currentUser?.email || ""}
                      disabled
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
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
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                {successMessage && (
                  <div className="flex items-center gap-2 p-3 mb-4 text-sm rounded-md bg-green-50 text-green-600">
                    <Check className="h-4 w-4" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 mb-4 text-sm rounded-md bg-red-50 text-red-600">
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
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
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
                      className="mt-4 bg-blue-600 hover:bg-blue-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting
                        ? "Changing Password..."
                        : "Change Password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Customize your application experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  Preference settings coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
