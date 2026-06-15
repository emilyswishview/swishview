 import React, { useState } from "react";
 import { format } from "date-fns";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
 import { Calendar as CalendarComponent } from "@/components/ui/calendar";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { useToast } from "@/hooks/use-toast";
 import { supabase } from "@/integrations/supabase/client";
 import Navbar from "@/components/Navbar";
 import { CheckCircle, Calendar, User, Clock, CalendarIcon } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 const growthManagers = [
   { name: "Jasmine", image: "/team/jasmine.jpg" },
   { name: "Emily", image: "/team/emily.jpg" },
   { name: "Sophie", image: "/team/sophie.jpg" },
   { name: "Novella", image: "/team/novella.jpg" },
   { name: "Scarlett", image: "/team/scarlett.jpg" },
   { name: "Daisy", image: "/team/daisy.jpg" },
   { name: "Ami", image: "/team/ami.jpg" },
 ];
 
 const durationOptions = [
   { value: "3", label: "3 Months" },
   { value: "6", label: "6 Months" },
   { value: "9", label: "9 Months" },
   { value: "12", label: "12 Months" },
   { value: "custom", label: "Custom" },
 ];
 
 const BookAProject = () => {
   const { toast } = useToast();
   const [selectedManager, setSelectedManager] = useState("");
   const [duration, setDuration] = useState("");
   const [startDate, setStartDate] = useState<Date>();
   const [endDate, setEndDate] = useState<Date>();
   const [clientName, setClientName] = useState("");
   const [clientEmail, setClientEmail] = useState("");
   const [clientPhone, setClientPhone] = useState("");
   const [projectDetails, setProjectDetails] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isSuccess, setIsSuccess] = useState(false);
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!selectedManager || !duration || !clientName || !clientEmail) {
       toast({
         title: "Missing Information",
         description: "Please fill in all required fields.",
         variant: "destructive",
       });
       return;
     }
 
     if (duration === "custom" && (!startDate || !endDate)) {
       toast({
         title: "Missing Duration",
         description: "Please select start and end dates.",
         variant: "destructive",
       });
       return;
     }
 
     setIsSubmitting(true);
 
     try {
       const finalDuration = duration === "custom" 
         ? `${format(startDate!, "PPP")} to ${format(endDate!, "PPP")}`
         : `${duration} months`;
 
       const { error } = await supabase.functions.invoke("send-booking-email", {
         body: {
           clientName,
           clientEmail,
           clientPhone,
           selectedManager,
           duration: finalDuration,
           projectDetails,
         },
       });
 
       if (error) throw error;
 
       setIsSuccess(true);
       toast({
         title: "Request Submitted!",
         description: "Our team will connect with you soon.",
       });
     } catch (error) {
       console.error("Error submitting booking:", error);
       toast({
         title: "Error",
         description: "Failed to submit your request. Please try again.",
         variant: "destructive",
       });
     } finally {
       setIsSubmitting(false);
     }
   };
 
   if (isSuccess) {
     return (
       <div className="min-h-screen flex flex-col">
         <Navbar />
         <main className="flex-1 flex items-center justify-center py-16 px-4">
           <Card className="max-w-md w-full text-center">
             <CardContent className="pt-12 pb-8">
               <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                 <CheckCircle className="w-10 h-10 text-primary" />
               </div>
               <h2 className="text-2xl font-bold text-foreground mb-4">
                 Request Submitted Successfully!
               </h2>
               <p className="text-muted-foreground mb-6">
                 Our team will connect with you soon. We've received your booking request and will reach out to discuss the next steps.
               </p>
               <Button onClick={() => window.location.href = "/"}>
                 Back to Home
               </Button>
             </CardContent>
           </Card>
         </main>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen flex flex-col">
       <Navbar />
       <main className="flex-1 pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-background">
         <div className="max-w-4xl mx-auto">
           <div className="text-center mb-10">
             <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
               Book a Project
             </h1>
           </div>
 
           <form onSubmit={handleSubmit} className="space-y-8">
             {/* Client Information */}
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <User className="w-5 h-5" />
                   Your Information
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="name">Full Name *</Label>
                     <Input
                       id="name"
                       value={clientName}
                       onChange={(e) => setClientName(e.target.value)}
                       placeholder="Your full name"
                       required
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="email">Email Address *</Label>
                     <Input
                       id="email"
                       type="email"
                       value={clientEmail}
                       onChange={(e) => setClientEmail(e.target.value)}
                       placeholder="your@email.com"
                       required
                     />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="phone">Phone Number (Optional)</Label>
                   <Input
                     id="phone"
                     type="tel"
                     value={clientPhone}
                     onChange={(e) => setClientPhone(e.target.value)}
                     placeholder="+1 (555) 000-0000"
                   />
                 </div>
               </CardContent>
             </Card>
 
             {/* Growth Manager Selection */}
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <User className="w-5 h-5" />
                   Choose Your Growth Manager *
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <RadioGroup
                   value={selectedManager}
                   onValueChange={setSelectedManager}
                   className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                 >
                   {growthManagers.map((manager) => (
                     <div key={manager.name}>
                       <RadioGroupItem
                         value={manager.name}
                         id={manager.name}
                         className="peer sr-only"
                       />
                       <Label
                         htmlFor={manager.name}
                         className="flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50"
                       >
                         <div className="w-16 h-16 rounded-full bg-muted overflow-hidden">
                           <img
                             src={manager.image}
                             alt={manager.name}
                             className="w-full h-full object-cover"
                             onError={(e) => {
                               (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${manager.name}&background=random`;
                             }}
                           />
                         </div>
                         <span className="font-medium text-foreground">{manager.name}</span>
                       </Label>
                     </div>
                   ))}
                 </RadioGroup>
               </CardContent>
             </Card>
 
             {/* Duration Selection */}
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Calendar className="w-5 h-5" />
                   Project Duration *
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <RadioGroup
                   value={duration}
                   onValueChange={setDuration}
                   className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4"
                 >
                   {durationOptions.map((option) => (
                     <div key={option.value}>
                       <RadioGroupItem
                         value={option.value}
                         id={`duration-${option.value}`}
                         className="peer sr-only"
                       />
                       <Label
                         htmlFor={`duration-${option.value}`}
                         className="flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:border-primary/50 text-center"
                       >
                         <span className="font-medium">{option.label}</span>
                       </Label>
                     </div>
                   ))}
                 </RadioGroup>
 
                 {duration === "custom" && (
                   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
                     <div className="space-y-2">
                       <Label>Start Date</Label>
                       <Popover>
                         <PopoverTrigger asChild>
                           <Button
                             variant="outline"
                             className={cn(
                               "w-[200px] justify-start text-left font-normal",
                               !startDate && "text-muted-foreground"
                             )}
                           >
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {startDate ? format(startDate, "PPP") : "Pick a date"}
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                           <CalendarComponent
                             mode="single"
                             selected={startDate}
                             onSelect={setStartDate}
                             initialFocus
                             className={cn("p-3 pointer-events-auto")}
                           />
                         </PopoverContent>
                       </Popover>
                     </div>
                     <div className="space-y-2">
                       <Label>End Date</Label>
                       <Popover>
                         <PopoverTrigger asChild>
                           <Button
                             variant="outline"
                             className={cn(
                               "w-[200px] justify-start text-left font-normal",
                               !endDate && "text-muted-foreground"
                             )}
                           >
                             <CalendarIcon className="mr-2 h-4 w-4" />
                             {endDate ? format(endDate, "PPP") : "Pick a date"}
                           </Button>
                         </PopoverTrigger>
                         <PopoverContent className="w-auto p-0" align="start">
                           <CalendarComponent
                             mode="single"
                             selected={endDate}
                             onSelect={setEndDate}
                             disabled={(date) => startDate ? date < startDate : false}
                             initialFocus
                             className={cn("p-3 pointer-events-auto")}
                           />
                         </PopoverContent>
                       </Popover>
                     </div>
                   </div>
                 )}
               </CardContent>
             </Card>
 
             {/* Project Details */}
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Clock className="w-5 h-5" />
                   Project Details
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <textarea
                   value={projectDetails}
                   onChange={(e) => setProjectDetails(e.target.value)}
                   placeholder="Tell us about your channel, goals, and what you're looking to achieve..."
                   className="w-full min-h-[120px] px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                 />
               </CardContent>
             </Card>
 
             {/* Submit Button */}
             <div className="flex justify-center pb-8">
               <Button
                 type="submit"
                 size="lg"
                 className="px-12"
                 disabled={isSubmitting}
               >
                 {isSubmitting ? "Submitting..." : "Request to Reserve a Slot"}
               </Button>
             </div>
           </form>
         </div>
       </main>
     </div>
   );
 };
 
 export default BookAProject;
