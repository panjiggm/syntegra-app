import * as React from "react";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";

interface Calendar20Props {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  endValue?: string;
  onEndChange?: (value: string) => void;
  endLabel?: string;
}

// Helper function to format datetime for backend
const formatDateTimeForBackend = (date: Date): string => {
  // Simply return the ISO string - the Date object already represents the correct time
  return date.toISOString();
};

export default function Calendar20({
  value,
  onChange,
  placeholder,
  disabled,
  label,
  endValue,
  onEndChange,
  endLabel,
}: Calendar20Props) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [selectedStartTime, setSelectedStartTime] = React.useState<
    string | null
  >(
    value
      ? new Date(value).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "09:00"
  );
  const [selectedEndTime, setSelectedEndTime] = React.useState<string | null>(
    endValue
      ? new Date(endValue).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "12:00"
  );

  const timeSlots = Array.from({ length: 65 }, (_, i) => {
    const totalMinutes = i * 15;
    const hour = Math.floor(totalMinutes / 60) + 6;
    const minute = totalMinutes % 60;
    if (hour > 22) return null;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }).filter(Boolean) as string[];

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);

      if (selectedStartTime) {
        const [hours, minutes] = selectedStartTime.split(":");
        const startDateTime = new Date(selectedDate);
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        onChange(formatDateTimeForBackend(startDateTime));
      }

      if (onEndChange && selectedEndTime) {
        const [hours, minutes] = selectedEndTime.split(":");
        const endDateTime = new Date(selectedDate);
        endDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        onEndChange(formatDateTimeForBackend(endDateTime));
      }
    }
  };

  const handleStartTimeSelect = (time: string) => {
    setSelectedStartTime(time);

    if (date) {
      const [hours, minutes] = time.split(":");
      const startDateTime = new Date(date);
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      onChange(formatDateTimeForBackend(startDateTime));
    }
  };

  const handleEndTimeSelect = (time: string) => {
    setSelectedEndTime(time);

    if (date && onEndChange) {
      const [hours, minutes] = time.split(":");
      const endDateTime = new Date(date);
      endDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      onEndChange(formatDateTimeForBackend(endDateTime));
    }
  };

  const formatDateDisplay = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const isEndTimeValid = (endTime: string) => {
    if (!selectedStartTime) return true;
    return endTime > selectedStartTime;
  };

  return (
    <Card className="gap-0 p-0">
      <CardContent className="relative p-0 md:pr-96">
        <div className="p-6">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            defaultMonth={date}
            disabled={(date) =>
              date < new Date(new Date().setHours(0, 0, 0, 0))
            }
            showOutsideDays={false}
            className="bg-transparent p-0 [--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
            formatters={{
              formatWeekdayName: (date) => {
                return date.toLocaleString("id-ID", { weekday: "short" });
              },
            }}
          />
        </div>

        <div className="inset-y-0 right-0 flex max-h-80 w-full flex-col gap-4 overflow-hidden border-t md:absolute md:max-h-none md:w-96 md:flex-row md:border-t-0 md:border-l">
          <div className="flex-1 border-r">
            <div className="border-b p-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Waktu Mulai</Label>
              </div>
              {selectedStartTime && (
                <p className="text-xs text-muted-foreground mt-1">
                  Dipilih: {selectedStartTime}
                </p>
              )}
            </div>
            <div className="no-scrollbar h-full overflow-y-auto p-4 pb-24">
              <div className="grid gap-1">
                {timeSlots.map((time) => (
                  <Button
                    key={`start-${time}`}
                    variant={selectedStartTime === time ? "default" : "outline"}
                    onClick={() => handleStartTimeSelect(time)}
                    className="w-full shadow-none text-xs h-8"
                    disabled={disabled}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {onEndChange && (
            <div className="flex-1">
              <div className="border-b p-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">
                    {endLabel || "Waktu Selesai"}
                  </Label>
                </div>
                {selectedEndTime && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Dipilih: {selectedEndTime}
                  </p>
                )}
              </div>
              <div className="no-scrollbar h-full overflow-y-auto p-4 pb-24">
                <div className="grid gap-1">
                  {timeSlots.map((time) => (
                    <Button
                      key={`end-${time}`}
                      variant={selectedEndTime === time ? "default" : "outline"}
                      onClick={() => handleEndTimeSelect(time)}
                      className="w-full shadow-none text-xs h-8"
                      disabled={disabled || !isEndTimeValid(time)}
                    >
                      {time}
                      {!isEndTimeValid(time) && (
                        <span className="ml-1 text-xs opacity-50">
                          (terlalu awal)
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t px-6 !py-5 md:flex-row">
        <div className="text-sm">
          {date && selectedStartTime ? (
            <>
              Sesi Psikotes akan dilaksanakan pada{" "}
              <span className="font-medium">
                {" "}
                {date?.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}{" "}
              </span>
              pukul <span className="font-medium">{selectedStartTime}</span>{" "}
              sampai
              <span className="font-medium"> {selectedEndTime}</span>.
            </>
          ) : (
            <>Pilih tanggal dan waktu untuk sesi psikotes.</>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
