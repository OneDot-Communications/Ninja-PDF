"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/services/api";

export default function FeedbackPage() {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [feedbackType, setFeedbackType] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("Please enter your name");
            return;
        }

        if (!feedbackType) {
            toast.error("Please select a feedback type");
            return;
        }

        if (!description.trim()) {
            toast.error("Please enter a description");
            return;
        }

        setLoading(true);
        try {
            // Call backend API to submit feedback
            const response = await api.submitFeedback({
                name,
                feedback_type: feedbackType,
                description
            });

            if (response.success) {
                toast.success(response.message || "Feedback submitted successfully! Thank you for your input.");

                // Reset form
                setName("");
                setFeedbackType("");
                setDescription("");
            } else {
                toast.error(response.message || "Failed to submit feedback. Please try again.");
            }
        } catch (error: any) {
            console.error("Error submitting feedback:", error);
            toast.error(error.message || "Failed to submit feedback. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Feedback</h2>
                <p className="text-muted-foreground">Share your thoughts and help us improve.</p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#3371eb]" />
                        <CardTitle>Send Us Your Feedback</CardTitle>
                    </div>
                    <CardDescription>
                        We value your feedback! Let us know about bugs, new features, or UI improvements.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name Field */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-[#232323] text-base font-normal">
                                Name
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Enter your name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus:border-[#3371eb] focus:ring-[#3371eb]"
                            />
                        </div>

                        {/* Feedback Type Dropdown */}
                        <div className="space-y-2">
                            <Label htmlFor="feedback-type" className="text-[#232323] text-base font-normal">
                                Feedback Type
                            </Label>
                            <Select value={feedbackType} onValueChange={setFeedbackType}>
                                <SelectTrigger
                                    id="feedback-type"
                                    className="h-[50px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] pl-4 pr-4 focus:border-[#3371eb] focus:ring-[#3371eb]"
                                >
                                    <SelectValue placeholder="Select feedback type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bug">Bug</SelectItem>
                                    <SelectItem value="functionality">Add functionality</SelectItem>
                                    <SelectItem value="ui">Change UI</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Description Textarea */}
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-[#232323] text-base font-normal">
                                Description
                            </Label>
                            <Textarea
                                id="description"
                                placeholder="Tell us more about your feedback..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="min-h-[150px] rounded-[15px] border-[#dfeaf2] bg-white text-[#718ebf] text-[15px] p-4 focus:border-[#3371eb] focus:ring-[#3371eb] resize-none"
                                rows={6}
                            />
                            <p className="text-xs text-[#718ebf]">
                                Please provide as much detail as possible to help us understand your feedback.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end pt-2">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-[#3371eb] hover:bg-[#2a5fd6] text-white px-8 py-3 rounded-lg font-medium text-base min-w-[190px] h-[50px] transition-colors flex items-center gap-2"
                            >
                                {loading ? (
                                    "Submitting..."
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Submit Feedback
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
