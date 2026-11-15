"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { questionSchema, formatPhone, type QuestionForm } from "@/lib/schemas";
import { askQuestion } from "@/lib/store";
import type { Listing } from "@/lib/types";

export function AskQuestion({ listing, open, onOpenChange }: { listing: Listing; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<QuestionForm>({ resolver: zodResolver(questionSchema), defaultValues: { name: "", email: "", phone: "", message: `Hi Mike, I have a question about ${listing.address}.` } });
  const submit = handleSubmit(async (d) => {
    await new Promise((r) => setTimeout(r, 450));
    askQuestion({ listingId: listing.id, name: d.name, email: d.email, phone: d.phone ? formatPhone(d.phone) : "", message: d.message });
    toast.success("Question saved to the demo dashboard", { description: "Simulated. No message was sent." });
    reset();
    onOpenChange(false);
  });
  const err = (m?: string) => m && <p className="text-[12.5px] font-medium text-destructive" role="alert">{m}</p>;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-[22px] font-medium">Ask Mike a question</DialogTitle>
          <DialogDescription>About {listing.address}. In this demo your question shows up as a lead in the Realtor View, and nothing is sent.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3" noValidate>
          <div className="grid gap-1.5"><Label htmlFor="q-name">Name</Label><Input id="q-name" autoComplete="name" {...register("name")} />{err(errors.name?.message)}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5"><Label htmlFor="q-email">Email</Label><Input id="q-email" type="email" {...register("email")} />{err(errors.email?.message)}</div>
            <div className="grid gap-1.5"><Label htmlFor="q-phone">Phone (optional)</Label><Input id="q-phone" type="tel" {...register("phone")} />{err(errors.phone?.message)}</div>
          </div>
          <div className="grid gap-1.5"><Label htmlFor="q-msg">Question</Label><Textarea id="q-msg" rows={4} {...register("message")} />{err(errors.message?.message)}</div>
          <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Send question (demo)"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
