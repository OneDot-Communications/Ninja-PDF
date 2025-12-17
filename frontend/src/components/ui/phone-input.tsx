"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/app/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/app/components/ui/popover";
import { countries } from "@/app/lib/countries";

interface PhoneInputProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onCountryChange?: (countryCode: string) => void;
    initialCountry?: string; // ISO code (e.g., 'US')
}

export function PhoneInput({ value = "", onChange, placeholder = "Phone number", onCountryChange, initialCountry = "US" }: PhoneInputProps) {
    const [open, setOpen] = React.useState(false);

    // Find initial country object
    const [selectedCountry, setSelectedCountry] = React.useState(() => {
        return countries.find(c => c.code === initialCountry) || countries.find(c => c.code === "US")!;
    });

    const [phoneNumber, setPhoneNumber] = React.useState("");

    // Initialize/Sync internal states
    React.useEffect(() => {
        // If value has content, try to parse country code from it if possible, OR just use it
        // Simpler for now: just stick with initialCountry or whatever was selected
        // We'll manage value changes by appending dial code + input

        // However, if we're editing an existing number, we might ideally want to extract valid country...
        // For MVP, we'll strip the dial code from the display input if it matches the selected country

        if (value && value.startsWith(selectedCountry.dial_code)) {
            setPhoneNumber(value.slice(selectedCountry.dial_code.length).trim());
        } else if (value) {
            // It might be a number with a different country code, or just raw digits
            setPhoneNumber(value);
        }
    }, [value, selectedCountry.dial_code]); // Only on mount or outside change basically

    const handleCountrySelect = (countryCode: string) => {
        const country = countries.find((c) => c.code === countryCode);
        if (country) {
            setSelectedCountry(country);
            setOpen(false);
            if (onCountryChange) {
                onCountryChange(country.code);
            }
            // Update parent value
            const newVal = `${country.dial_code} ${phoneNumber}`;
            onChange(newVal);
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPhoneNumber(val);
        const newVal = `${selectedCountry.dial_code} ${val}`;
        onChange(newVal);
    };

    return (
        <div className="flex w-full items-center space-x-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[110px] justify-between px-3"
                    >
                        <span className="flex items-center gap-2 truncate">
                            <span className="text-lg">{selectedCountry.flag}</span>
                            <span className="text-xs text-muted-foreground">{selectedCountry.dial_code}</span>
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder="Search country or code..." />
                        <CommandList>
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                                {countries.map((country) => (
                                    <CommandItem
                                        key={country.code}
                                        value={`${country.name} ${country.dial_code}`}
                                        onSelect={() => handleCountrySelect(country.code)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedCountry.code === country.code
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        <span className="mr-2 text-lg">{country.flag}</span>
                                        <span className="flex-1 truncate">{country.name}</span>
                                        <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                                            {country.dial_code}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <Input
                placeholder={placeholder}
                value={phoneNumber}
                onChange={handlePhoneChange}
                className="flex-1"
                type="tel"
            />
        </div>
    );
}
