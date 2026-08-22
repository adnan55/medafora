"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Pill,
  ShieldAlert,
  Ban,
  MapPin,
  User,
  Calendar,
  Layers,
  Edit3,
  ExternalLink,
  XIcon,
  Sun,
  AlertTriangle,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { calculateExpiryStatus } from "@/lib/utils/expiryCalculator";

interface MedicineDetailsDrawerProps {
  medicine: any;
  trigger?: React.ReactNode;
}

export function MedicineDetailsDrawer({ medicine, trigger }: MedicineDetailsDrawerProps) {
  const [open, setOpen] = useState(false);

  const expiryStatus = calculateExpiryStatus(medicine.expiry_date);
  const isExpired = expiryStatus.label === "Expired";
  const isUrgent = expiryStatus.label === "< 15 Days";

  let statusBg = isExpired
    ? "bg-rose-100 text-rose-800 border-rose-200"
    : isUrgent
    ? "bg-amber-100 text-amber-800 border-amber-200"
    : "bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8]";

  let dotColor = isExpired ? "bg-rose-600" : isUrgent ? "bg-amber-600" : "bg-emerald-600";

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="inline-flex cursor-pointer">
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-[#DDFBEF] bg-[#2F4858] hover:bg-[#1E313D] shadow-sm hover:shadow-md cursor-pointer flex items-center gap-1.5 transition-all duration-200 hover:-translate-y-1 active:translate-y-0 active:scale-95"
        >
          <span>View Details & Safety</span>
          <ExternalLink className="size-3.5" />
        </button>
      )}

      <Drawer swipeDirection="right" open={open} onOpenChange={setOpen}>
        <DrawerContent
          side="right"
          className="h-full w-full sm:max-w-lg bg-white border-l border-[#2F4858]/15 shadow-2xl overflow-hidden flex flex-col text-[#2F4858]"
        >
        {/* Drawer Header */}
        <DrawerHeader className="flex-row items-center justify-between gap-2 border-b border-[#2F4858]/10 bg-[#F8FDFB] p-4 sm:p-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-2xl bg-[#2F4858] text-[#DDFBEF] flex items-center justify-center shadow-sm shrink-0">
              <Pill className="size-5" />
            </div>
            <div className="min-w-0">
              <DrawerTitle className="text-base font-extrabold text-[#2F4858] truncate">
                {medicine.medicine_name}
              </DrawerTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                {medicine.strength && (
                  <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-[#DDFBEF] text-[#2F4858] border-[#B7EED8]">
                    {medicine.strength}
                  </Badge>
                )}
                {medicine.is_daily_routine && (
                  <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                    <Sun className="size-2.5" /> Daily
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <DrawerClose
            render={
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl text-[#2F4858]/60 hover:text-[#2F4858] hover:bg-[#DDFBEF]/50 transition-colors cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            }
          />
        </DrawerHeader>

        {/* Scrollable Content Body */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="flex flex-col gap-4 sm:gap-5 p-4 sm:p-5">
            {/* Regulatory Ban / Hazard Warning */}
            {medicine.is_banned && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs uppercase tracking-wider">
                  <Ban className="size-4 text-rose-600 shrink-0" />
                  <span>Prohibited Drug Warning</span>
                </div>
                <p className="text-rose-800 text-xs font-medium leading-relaxed">
                  {medicine.ban_notice_details || "This drug formulation has been prohibited by regulatory authorities (CDSCO / FDA). Do not consume."}
                </p>
              </div>
            )}

            {/* Quick Status Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl border border-[#2F4858]/10 bg-[#F8FDFB] space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#2F4858]/60">Expiry Urgency</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`px-2 py-0.5 text-[11px] font-bold border ${statusBg} flex items-center gap-1.5`}>
                    <span className={`size-1.5 rounded-full ${dotColor}`} />
                    {expiryStatus.label}
                  </Badge>
                </div>
                <p className="text-[10px] text-[#2F4858]/70 pt-0.5">
                  Exp: {new Date(medicine.expiry_date).toLocaleDateString()}
                </p>
              </div>

              <div className="p-3 rounded-2xl border border-[#2F4858]/10 bg-[#F8FDFB] space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#2F4858]/60">Storage Spot</span>
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#2F4858]">
                  <MapPin className="size-3.5 text-[#2F4858]" />
                  <span className="truncate">{medicine.storage_location || "Unassigned"}</span>
                </div>
                <p className="text-[10px] text-[#2F4858]/70 pt-0.5">
                  Qty: {medicine.quantity} {medicine.unit || "units"}
                </p>
              </div>
            </div>

            <Separator className="bg-[#2F4858]/10" />

            {/* Active Salt Composition */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858]">
                  Active Salt Chemistry
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DDFBEF] text-[#2F4858] border border-[#B7EED8]">
                  Pharmacology
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#DDFBEF]/30 border border-[#B7EED8] text-xs font-bold text-[#2F4858]">
                {medicine.salt_composition || "No active salt specified"}
              </div>
            </div>

            {/* Primary Uses & Instructions */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#2F4858]">
                Clinical Indications & Instructions
              </span>
              <div className="p-3.5 rounded-2xl border border-[#2F4858]/10 bg-[#F8FDFB] space-y-2 text-xs">
                <div>
                  <span className="font-bold text-[#2F4858] block mb-0.5">Primary Use:</span>
                  <p className="text-[#2F4858]/80 font-medium">
                    {medicine.primary_uses || "General therapeutic use"}
                  </p>
                </div>
                {medicine.dosage_instructions && (
                  <div className="pt-2 border-t border-[#2F4858]/10">
                    <span className="font-bold text-[#2F4858] block mb-0.5">Dosage Directions:</span>
                    <p className="text-[#2F4858]/80 font-medium">{medicine.dosage_instructions}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Member / Shared */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F8FDFB] border border-[#2F4858]/10 text-xs">
              <span className="font-bold text-[#2F4858]/70">Profile Assignment</span>
              {medicine.family_members ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#DDFBEF] text-[#2F4858] border border-[#B7EED8]">
                  <User className="size-3.5" />
                  {medicine.family_members.full_name} ({medicine.family_members.relationship})
                </span>
              ) : (
                <span className="text-xs font-medium text-[#2F4858]/60 italic">Household Shared</span>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Drawer Footer Actions */}
        <DrawerFooter className="border-t border-[#2F4858]/10 p-4 bg-[#F8FDFB] flex flex-row items-center gap-2">
          <Button
            render={<Link href={`/medicines/${medicine.id}/edit`} />}
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl text-xs font-bold border-[#2F4858]/20 text-[#2F4858] hover:bg-[#DDFBEF]/50 cursor-pointer h-10 flex items-center justify-center gap-1.5"
          >
            <Edit3 className="size-3.5" />
            <span>Edit Entry</span>
          </Button>

          <Button
            render={<Link href={`/medicines/${medicine.id}`} />}
            size="sm"
            className="flex-1 rounded-xl text-xs font-extrabold bg-[#2F4858] hover:bg-[#1E313D] text-[#DDFBEF] cursor-pointer h-10 shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>Full Page</span>
            <ExternalLink className="size-3.5" />
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
    </>
  );
}
