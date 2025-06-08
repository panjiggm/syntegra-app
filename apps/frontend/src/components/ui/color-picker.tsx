"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorOption {
  name: string;
  value: string;
  bgClass: string;
  textClass: string;
  preview: string;
}

const colorOptions: ColorOption[] = [
  // Red variants
  {
    name: "Red",
    value: "from-red-500 to-red-600",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
    preview: "bg-red-500",
  },

  // Orange variants
  {
    name: "Orange",
    value: "from-orange-500 to-orange-600",
    bgClass: "bg-orange-100",
    textClass: "text-orange-700",
    preview: "bg-orange-500",
  },

  // Amber variants
  {
    name: "Amber",
    value: "from-amber-500 to-amber-600",
    bgClass: "bg-amber-100",
    textClass: "text-amber-700",
    preview: "bg-amber-500",
  },

  // Yellow variants
  {
    name: "Yellow",
    value: "from-yellow-500 to-yellow-600",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-700",
    preview: "bg-yellow-500",
  },

  // Lime variants
  {
    name: "Lime",
    value: "from-lime-500 to-lime-600",
    bgClass: "bg-lime-100",
    textClass: "text-lime-700",
    preview: "bg-lime-500",
  },

  // Green variants
  {
    name: "Green",
    value: "from-green-500 to-green-600",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
    preview: "bg-green-500",
  },

  // Emerald variants
  {
    name: "Emerald",
    value: "from-emerald-500 to-emerald-600",
    bgClass: "bg-emerald-100",
    textClass: "text-emerald-700",
    preview: "bg-emerald-500",
  },

  // Teal variants
  {
    name: "Teal",
    value: "from-teal-500 to-teal-600",
    bgClass: "bg-teal-100",
    textClass: "text-teal-700",
    preview: "bg-teal-500",
  },

  // Cyan variants
  {
    name: "Cyan",
    value: "from-cyan-500 to-cyan-600",
    bgClass: "bg-cyan-100",
    textClass: "text-cyan-700",
    preview: "bg-cyan-500",
  },

  // Sky variants
  {
    name: "Sky",
    value: "from-sky-500 to-sky-600",
    bgClass: "bg-sky-100",
    textClass: "text-sky-700",
    preview: "bg-sky-500",
  },

  // Blue variants
  {
    name: "Blue",
    value: "from-blue-500 to-blue-600",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
    preview: "bg-blue-500",
  },

  // Indigo variants
  {
    name: "Indigo",
    value: "from-indigo-500 to-indigo-600",
    bgClass: "bg-indigo-100",
    textClass: "text-indigo-700",
    preview: "bg-indigo-500",
  },

  // Violet variants
  {
    name: "Violet",
    value: "from-violet-500 to-violet-600",
    bgClass: "bg-violet-100",
    textClass: "text-violet-700",
    preview: "bg-violet-500",
  },

  // Purple variants
  {
    name: "Purple",
    value: "from-purple-500 to-purple-600",
    bgClass: "bg-purple-100",
    textClass: "text-purple-700",
    preview: "bg-purple-500",
  },

  // Fuchsia variants
  {
    name: "Fuchsia",
    value: "from-fuchsia-500 to-fuchsia-600",
    bgClass: "bg-fuchsia-100",
    textClass: "text-fuchsia-700",
    preview: "bg-fuchsia-500",
  },

  // Pink variants
  {
    name: "Pink",
    value: "from-pink-500 to-pink-600",
    bgClass: "bg-pink-100",
    textClass: "text-pink-700",
    preview: "bg-pink-500",
  },

  // Rose variants
  {
    name: "Rose",
    value: "from-rose-500 to-rose-600",
    bgClass: "bg-rose-100",
    textClass: "text-rose-700",
    preview: "bg-rose-500",
  },

  // Neutral variants
  {
    name: "Slate",
    value: "from-slate-500 to-slate-600",
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
    preview: "bg-slate-500",
  },
  {
    name: "Gray",
    value: "from-gray-500 to-gray-600",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    preview: "bg-gray-500",
  },
  {
    name: "Zinc",
    value: "from-zinc-500 to-zinc-600",
    bgClass: "bg-zinc-100",
    textClass: "text-zinc-700",
    preview: "bg-zinc-500",
  },
  {
    name: "Neutral",
    value: "from-neutral-500 to-neutral-600",
    bgClass: "bg-neutral-100",
    textClass: "text-neutral-700",
    preview: "bg-neutral-500",
  },
  {
    name: "Stone",
    value: "from-stone-500 to-stone-600",
    bgClass: "bg-stone-100",
    textClass: "text-stone-700",
    preview: "bg-stone-500",
  },
];

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  const [open, setOpen] = useState(false);

  const selectedColor = colorOptions.find((color) => color.value === value);

  const handleColorSelect = (colorValue: string) => {
    onChange(colorValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full justify-start"
          type="button"
        >
          {selectedColor ? (
            <div className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded", selectedColor.preview)} />
              <Badge className={selectedColor.value} variant="secondary">
                {selectedColor.name}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Pilih warna</span>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-3">
          <h4 className="font-medium leading-none">Pilih Warna Tema</h4>
          <div className="grid grid-cols-4 gap-2">
            {colorOptions.map((color) => (
              <Button
                key={color.value}
                variant="ghost"
                className={cn(
                  "h-auto p-2 flex flex-col items-center gap-1 relative",
                  value === color.value && "ring-2 ring-primary"
                )}
                onClick={() => handleColorSelect(color.value)}
                type="button"
              >
                <div className={cn("w-6 h-6 rounded", color.preview)} />
                <span className="text-xs font-medium">{color.name}</span>
                {value === color.value && (
                  <Check className="h-3 w-3 absolute top-1 right-1 text-primary" />
                )}
              </Button>
            ))}
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Warna akan mempengaruhi tampilan card tes pada dashboard peserta
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
