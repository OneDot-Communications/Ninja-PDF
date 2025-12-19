"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

// Simplified list of countries with max length for validation
const countries = [
    { name: "Afghanistan", code: "AF", dial_code: "+93", maxLen: 9 },
    { name: "Albania", code: "AL", dial_code: "+355", maxLen: 9 },
    { name: "Algeria", code: "DZ", dial_code: "+213", maxLen: 9 },
    { name: "American Samoa", code: "AS", dial_code: "+1-684", maxLen: 7 },
    { name: "Andorra", code: "AD", dial_code: "+376", maxLen: 6 },
    { name: "Angola", code: "AO", dial_code: "+244", maxLen: 9 },
    { name: "Anguilla", code: "AI", dial_code: "+1-264", maxLen: 7 },
    { name: "Antarctica", code: "AQ", dial_code: "+672", maxLen: 6 },
    { name: "Antigua and Barbuda", code: "AG", dial_code: "+1-268", maxLen: 7 },
    { name: "Argentina", code: "AR", dial_code: "+54", maxLen: 10 },
    { name: "Armenia", code: "AM", dial_code: "+374", maxLen: 8 },
    { name: "Aruba", code: "AW", dial_code: "+297", maxLen: 7 },
    { name: "Australia", code: "AU", dial_code: "+61", maxLen: 9 },
    { name: "Austria", code: "AT", dial_code: "+43", maxLen: 10 },
    { name: "Azerbaijan", code: "AZ", dial_code: "+994", maxLen: 9 },
    { name: "Bahamas", code: "BS", dial_code: "+1-242", maxLen: 7 },
    { name: "Bahrain", code: "BH", dial_code: "+973", maxLen: 8 },
    { name: "Bangladesh", code: "BD", dial_code: "+880", maxLen: 10 },
    { name: "Barbados", code: "BB", dial_code: "+1-246", maxLen: 7 },
    { name: "Belarus", code: "BY", dial_code: "+375", maxLen: 9 },
    { name: "Belgium", code: "BE", dial_code: "+32", maxLen: 9 },
    { name: "Belize", code: "BZ", dial_code: "+501", maxLen: 7 },
    { name: "Benin", code: "BJ", dial_code: "+229", maxLen: 8 },
    { name: "Bermuda", code: "BM", dial_code: "+1-441", maxLen: 7 },
    { name: "Bhutan", code: "BT", dial_code: "+975", maxLen: 8 },
    { name: "Bolivia", code: "BO", dial_code: "+591", maxLen: 9 },
    { name: "Bosnia and Herzegovina", code: "BA", dial_code: "+387", maxLen: 8 },
    { name: "Botswana", code: "BW", dial_code: "+267", maxLen: 8 },
    { name: "Brazil", code: "BR", dial_code: "+55", maxLen: 11 },
    { name: "British Indian Ocean Territory", code: "IO", dial_code: "+246", maxLen: 7 },
    { name: "British Virgin Islands", code: "VG", dial_code: "+1-284", maxLen: 7 },
    { name: "Brunei", code: "BN", dial_code: "+673", maxLen: 7 },
    { name: "Bulgaria", code: "BG", dial_code: "+359", maxLen: 9 },
    { name: "Burkina Faso", code: "BF", dial_code: "+226", maxLen: 8 },
    { name: "Burundi", code: "BI", dial_code: "+257", maxLen: 8 },
    { name: "Cambodia", code: "KH", dial_code: "+855", maxLen: 9 },
    { name: "Cameroon", code: "CM", dial_code: "+237", maxLen: 9 },
    { name: "Canada", code: "CA", dial_code: "+1", maxLen: 10 },
    { name: "Cape Verde", code: "CV", dial_code: "+238", maxLen: 7 },
    { name: "Cayman Islands", code: "KY", dial_code: "+1-345", maxLen: 7 },
    { name: "Central African Republic", code: "CF", dial_code: "+236", maxLen: 8 },
    { name: "Chad", code: "TD", dial_code: "+235", maxLen: 8 },
    { name: "Chile", code: "CL", dial_code: "+56", maxLen: 9 },
    { name: "China", code: "CN", dial_code: "+86", maxLen: 11 },
    { name: "Christmas Island", code: "CX", dial_code: "+61", maxLen: 9 },
    { name: "Cocos Islands", code: "CC", dial_code: "+61", maxLen: 9 },
    { name: "Colombia", code: "CO", dial_code: "+57", maxLen: 10 },
    { name: "Comoros", code: "KM", dial_code: "+269", maxLen: 7 },
    { name: "Cook Islands", code: "CK", dial_code: "+682", maxLen: 5 },
    { name: "Costa Rica", code: "CR", dial_code: "+506", maxLen: 8 },
    { name: "Croatia", code: "HR", dial_code: "+385", maxLen: 9 },
    { name: "Cuba", code: "CU", dial_code: "+53", maxLen: 8 },
    { name: "Curacao", code: "CW", dial_code: "+599", maxLen: 8 },
    { name: "Cyprus", code: "CY", dial_code: "+357", maxLen: 8 },
    { name: "Czech Republic", code: "CZ", dial_code: "+420", maxLen: 9 },
    { name: "Democratic Republic of the Congo", code: "CD", dial_code: "+243", maxLen: 9 },
    { name: "Denmark", code: "DK", dial_code: "+45", maxLen: 8 },
    { name: "Djibouti", code: "DJ", dial_code: "+253", maxLen: 8 },
    { name: "Dominica", code: "DM", dial_code: "+1-767", maxLen: 7 },
    { name: "Dominican Republic", code: "DO", dial_code: "+1-809, 1-829, 1-849", maxLen: 10 },
    { name: "East Timor", code: "TL", dial_code: "+670", maxLen: 8 },
    { name: "Ecuador", code: "EC", dial_code: "+593", maxLen: 9 },
    { name: "Egypt", code: "EG", dial_code: "+20", maxLen: 10 },
    { name: "El Salvador", code: "SV", dial_code: "+503", maxLen: 8 },
    { name: "Equatorial Guinea", code: "GQ", dial_code: "+240", maxLen: 9 },
    { name: "Eritrea", code: "ER", dial_code: "+291", maxLen: 7 },
    { name: "Estonia", code: "EE", dial_code: "+372", maxLen: 8 },
    { name: "Ethiopia", code: "ET", dial_code: "+251", maxLen: 9 },
    { name: "Falkland Islands", code: "FK", dial_code: "+500", maxLen: 5 },
    { name: "Faroe Islands", code: "FO", dial_code: "+298", maxLen: 6 },
    { name: "Fiji", code: "FJ", dial_code: "+679", maxLen: 7 },
    { name: "Finland", code: "FI", dial_code: "+358", maxLen: 10 },
    { name: "France", code: "FR", dial_code: "+33", maxLen: 9 },
    { name: "French Polynesia", code: "PF", dial_code: "+689", maxLen: 6 },
    { name: "Gabon", code: "GA", dial_code: "+241", maxLen: 7 },
    { name: "Gambia", code: "GM", dial_code: "+220", maxLen: 7 },
    { name: "Georgia", code: "GE", dial_code: "+995", maxLen: 9 },
    { name: "Germany", code: "DE", dial_code: "+49", maxLen: 11 },
    { name: "Ghana", code: "GH", dial_code: "+233", maxLen: 9 },
    { name: "Gibraltar", code: "GI", dial_code: "+350", maxLen: 8 },
    { name: "Greece", code: "GR", dial_code: "+30", maxLen: 10 },
    { name: "Greenland", code: "GL", dial_code: "+299", maxLen: 6 },
    { name: "Grenada", code: "GD", dial_code: "+1-473", maxLen: 7 },
    { name: "Guam", code: "GU", dial_code: "+1-671", maxLen: 7 },
    { name: "Guatemala", code: "GT", dial_code: "+502", maxLen: 8 },
    { name: "Guernsey", code: "GG", dial_code: "+44-1481", maxLen: 6 },
    { name: "Guinea", code: "GN", dial_code: "+224", maxLen: 9 },
    { name: "Guinea-Bissau", code: "GW", dial_code: "+245", maxLen: 7 },
    { name: "Guyana", code: "GY", dial_code: "+592", maxLen: 7 },
    { name: "Haiti", code: "HT", dial_code: "+509", maxLen: 8 },
    { name: "Honduras", code: "HN", dial_code: "+504", maxLen: 8 },
    { name: "Hong Kong", code: "HK", dial_code: "+852", maxLen: 8 },
    { name: "Hungary", code: "HU", dial_code: "+36", maxLen: 9 },
    { name: "Iceland", code: "IS", dial_code: "+354", maxLen: 7 },
    { name: "India", code: "IN", dial_code: "+91", maxLen: 10 },
    { name: "Indonesia", code: "ID", dial_code: "+62", maxLen: 11 },
    { name: "Iran", code: "IR", dial_code: "+98", maxLen: 10 },
    { name: "Iraq", code: "IQ", dial_code: "+964", maxLen: 10 },
    { name: "Ireland", code: "IE", dial_code: "+353", maxLen: 9 },
    { name: "Isle of Man", code: "IM", dial_code: "+44-1624", maxLen: 6 },
    { name: "Israel", code: "IL", dial_code: "+972", maxLen: 9 },
    { name: "Italy", code: "IT", dial_code: "+39", maxLen: 10 },
    { name: "Ivory Coast", code: "CI", dial_code: "+225", maxLen: 8 },
    { name: "Jamaica", code: "JM", dial_code: "+1-876", maxLen: 7 },
    { name: "Japan", code: "JP", dial_code: "+81", maxLen: 10 },
    { name: "Jersey", code: "JE", dial_code: "+44-1534", maxLen: 6 },
    { name: "Jordan", code: "JO", dial_code: "+962", maxLen: 9 },
    { name: "Kazakhstan", code: "KZ", dial_code: "+7", maxLen: 10 },
    { name: "Kenya", code: "KE", dial_code: "+254", maxLen: 9 },
    { name: "Kiribati", code: "KI", dial_code: "+686", maxLen: 5 },
    { name: "Kosovo", code: "XK", dial_code: "+383", maxLen: 8 },
    { name: "Kuwait", code: "KW", dial_code: "+965", maxLen: 8 },
    { name: "Kyrgyzstan", code: "KG", dial_code: "+996", maxLen: 9 },
    { name: "Laos", code: "LA", dial_code: "+856", maxLen: 9 },
    { name: "Latvia", code: "LV", dial_code: "+371", maxLen: 8 },
    { name: "Lebanon", code: "LB", dial_code: "+961", maxLen: 8 },
    { name: "Lesotho", code: "LS", dial_code: "+266", maxLen: 8 },
    { name: "Liberia", code: "LR", dial_code: "+231", maxLen: 7 },
    { name: "Libya", code: "LY", dial_code: "+218", maxLen: 9 },
    { name: "Liechtenstein", code: "LI", dial_code: "+423", maxLen: 7 },
    { name: "Lithuania", code: "LT", dial_code: "+370", maxLen: 8 },
    { name: "Luxembourg", code: "LU", dial_code: "+352", maxLen: 9 },
    { name: "Macau", code: "MO", dial_code: "+853", maxLen: 8 },
    { name: "Macedonia", code: "MK", dial_code: "+389", maxLen: 8 },
    { name: "Madagascar", code: "MG", dial_code: "+261", maxLen: 9 },
    { name: "Malawi", code: "MW", dial_code: "+265", maxLen: 9 },
    { name: "Malaysia", code: "MY", dial_code: "+60", maxLen: 9 },
    { name: "Maldives", code: "MV", dial_code: "+960", maxLen: 7 },
    { name: "Mali", code: "ML", dial_code: "+223", maxLen: 8 },
    { name: "Malta", code: "MT", dial_code: "+356", maxLen: 8 },
    { name: "Marshall Islands", code: "MH", dial_code: "+692", maxLen: 7 },
    { name: "Mauritania", code: "MR", dial_code: "+222", maxLen: 8 },
    { name: "Mauritius", code: "MU", dial_code: "+230", maxLen: 7 },
    { name: "Mayotte", code: "YT", dial_code: "+262", maxLen: 9 },
    { name: "Mexico", code: "MX", dial_code: "+52", maxLen: 10 },
    { name: "Micronesia", code: "FM", dial_code: "+691", maxLen: 7 },
    { name: "Moldova", code: "MD", dial_code: "+373", maxLen: 8 },
    { name: "Monaco", code: "MC", dial_code: "+377", maxLen: 8 },
    { name: "Mongolia", code: "MN", dial_code: "+976", maxLen: 8 },
    { name: "Montenegro", code: "ME", dial_code: "+382", maxLen: 8 },
    { name: "Montserrat", code: "MS", dial_code: "+1-664", maxLen: 7 },
    { name: "Morocco", code: "MA", dial_code: "+212", maxLen: 9 },
    { name: "Mozambique", code: "MZ", dial_code: "+258", maxLen: 9 },
    { name: "Myanmar", code: "MM", dial_code: "+95", maxLen: 10 },
    { name: "Namibia", code: "NA", dial_code: "+264", maxLen: 9 },
    { name: "Nauru", code: "NR", dial_code: "+674", maxLen: 7 },
    { name: "Nepal", code: "NP", dial_code: "+977", maxLen: 10 },
    { name: "Netherlands", code: "NL", dial_code: "+31", maxLen: 9 },
    { name: "Netherlands Antilles", code: "AN", dial_code: "+599", maxLen: 8 },
    { name: "New Caledonia", code: "NC", dial_code: "+687", maxLen: 6 },
    { name: "New Zealand", code: "NZ", dial_code: "+64", maxLen: 9 },
    { name: "Nicaragua", code: "NI", dial_code: "+505", maxLen: 8 },
    { name: "Niger", code: "NE", dial_code: "+227", maxLen: 8 },
    { name: "Nigeria", code: "NG", dial_code: "+234", maxLen: 10 },
    { name: "Niue", code: "NU", dial_code: "+683", maxLen: 4 },
    { name: "North Korea", code: "KP", dial_code: "+850", maxLen: 10 },
    { name: "Northern Mariana Islands", code: "MP", dial_code: "+1-670", maxLen: 7 },
    { name: "Norway", code: "NO", dial_code: "+47", maxLen: 8 },
    { name: "Oman", code: "OM", dial_code: "+968", maxLen: 8 },
    { name: "Pakistan", code: "PK", dial_code: "+92", maxLen: 10 },
    { name: "Palau", code: "PW", dial_code: "+680", maxLen: 7 },
    { name: "Palestine", code: "PS", dial_code: "+970", maxLen: 9 },
    { name: "Panama", code: "PA", dial_code: "+507", maxLen: 7 },
    { name: "Papua New Guinea", code: "PG", dial_code: "+675", maxLen: 7 },
    { name: "Paraguay", code: "PY", dial_code: "+595", maxLen: 9 },
    { name: "Peru", code: "PE", dial_code: "+51", maxLen: 9 },
    { name: "Philippines", code: "PH", dial_code: "+63", maxLen: 10 },
    { name: "Pitcairn", code: "PN", dial_code: "+64", maxLen: 7 },
    { name: "Poland", code: "PL", dial_code: "+48", maxLen: 9 },
    { name: "Portugal", code: "PT", dial_code: "+351", maxLen: 9 },
    { name: "Puerto Rico", code: "PR", dial_code: "+1-787, 1-939", maxLen: 10 },
    { name: "Qatar", code: "QA", dial_code: "+974", maxLen: 8 },
    { name: "Republic of the Congo", code: "CG", dial_code: "+242", maxLen: 9 },
    { name: "Reunion", code: "RE", dial_code: "+262", maxLen: 9 },
    { name: "Romania", code: "RO", dial_code: "+40", maxLen: 10 },
    { name: "Russia", code: "RU", dial_code: "+7", maxLen: 10 },
    { name: "Rwanda", code: "RW", dial_code: "+250", maxLen: 9 },
    { name: "Saint Barthelemy", code: "BL", dial_code: "+590", maxLen: 6 },
    { name: "Saint Helena", code: "SH", dial_code: "+290", maxLen: 4 },
    { name: "Saint Kitts and Nevis", code: "KN", dial_code: "+1-869", maxLen: 7 },
    { name: "Saint Lucia", code: "LC", dial_code: "+1-758", maxLen: 7 },
    { name: "Saint Martin", code: "MF", dial_code: "+590", maxLen: 6 },
    { name: "Saint Pierre and Miquelon", code: "PM", dial_code: "+508", maxLen: 6 },
    { name: "Saint Vincent and the Grenadines", code: "VC", dial_code: "+1-784", maxLen: 7 },
    { name: "Samoa", code: "WS", dial_code: "+685", maxLen: 7 },
    { name: "San Marino", code: "SM", dial_code: "+378", maxLen: 10 },
    { name: "Sao Tome and Principe", code: "ST", dial_code: "+239", maxLen: 7 },
    { name: "Saudi Arabia", code: "SA", dial_code: "+966", maxLen: 9 },
    { name: "Senegal", code: "SN", dial_code: "+221", maxLen: 9 },
    { name: "Serbia", code: "RS", dial_code: "+381", maxLen: 9 },
    { name: "Seychelles", code: "SC", dial_code: "+248", maxLen: 7 },
    { name: "Sierra Leone", code: "SL", dial_code: "+232", maxLen: 8 },
    { name: "Singapore", code: "SG", dial_code: "+65", maxLen: 8 },
    { name: "Sint Maarten", code: "SX", dial_code: "+1-721", maxLen: 7 },
    { name: "Slovakia", code: "SK", dial_code: "+421", maxLen: 9 },
    { name: "Slovenia", code: "SI", dial_code: "+386", maxLen: 8 },
    { name: "Solomon Islands", code: "SB", dial_code: "+677", maxLen: 7 },
    { name: "Somalia", code: "SO", dial_code: "+252", maxLen: 8 },
    { name: "South Africa", code: "ZA", dial_code: "+27", maxLen: 9 },
    { name: "South Korea", code: "KR", dial_code: "+82", maxLen: 10 },
    { name: "South Sudan", code: "SS", dial_code: "+211", maxLen: 9 },
    { name: "Spain", code: "ES", dial_code: "+34", maxLen: 9 },
    { name: "Sri Lanka", code: "LK", dial_code: "+94", maxLen: 9 },
    { name: "Sudan", code: "SD", dial_code: "+249", maxLen: 9 },
    { name: "Suriname", code: "SR", dial_code: "+597", maxLen: 7 },
    { name: "Svalbard and Jan Mayen", code: "SJ", dial_code: "+47", maxLen: 8 },
    { name: "Swaziland", code: "SZ", dial_code: "+268", maxLen: 8 },
    { name: "Sweden", code: "SE", dial_code: "+46", maxLen: 9 },
    { name: "Switzerland", code: "CH", dial_code: "+41", maxLen: 9 },
    { name: "Syria", code: "SY", dial_code: "+963", maxLen: 9 },
    { name: "Taiwan", code: "TW", dial_code: "+886", maxLen: 9 },
    { name: "Tajikistan", code: "TJ", dial_code: "+992", maxLen: 9 },
    { name: "Tanzania", code: "TZ", dial_code: "+255", maxLen: 9 },
    { name: "Thailand", code: "TH", dial_code: "+66", maxLen: 9 },
    { name: "Togo", code: "TG", dial_code: "+228", maxLen: 8 },
    { name: "Tokelau", code: "TK", dial_code: "+690", maxLen: 4 },
    { name: "Tonga", code: "TO", dial_code: "+676", maxLen: 5 },
    { name: "Trinidad and Tobago", code: "TT", dial_code: "+1-868", maxLen: 7 },
    { name: "Tunisia", code: "TN", dial_code: "+216", maxLen: 8 },
    { name: "Turkey", code: "TR", dial_code: "+90", maxLen: 10 },
    { name: "Turkmenistan", code: "TM", dial_code: "+993", maxLen: 8 },
    { name: "Turks and Caicos Islands", code: "TC", dial_code: "+1-649", maxLen: 7 },
    { name: "Tuvalu", code: "TV", dial_code: "+688", maxLen: 5 },
    { name: "U.S. Virgin Islands", code: "VI", dial_code: "+1-340", maxLen: 7 },
    { name: "Uganda", code: "UG", dial_code: "+256", maxLen: 9 },
    { name: "Ukraine", code: "UA", dial_code: "+380", maxLen: 9 },
    { name: "United Arab Emirates", code: "AE", dial_code: "+971", maxLen: 9 },
    { name: "United Kingdom", code: "GB", dial_code: "+44", maxLen: 10 },
    { name: "United States", code: "US", dial_code: "+1", maxLen: 10 },
    { name: "Uruguay", code: "UY", dial_code: "+598", maxLen: 8 },
    { name: "Uzbekistan", code: "UZ", dial_code: "+998", maxLen: 9 },
    { name: "Vanuatu", code: "VU", dial_code: "+678", maxLen: 7 },
    { name: "Vatican", code: "VA", dial_code: "+379", maxLen: 10 },
    { name: "Venezuela", code: "VE", dial_code: "+58", maxLen: 10 },
    { name: "Vietnam", code: "VN", dial_code: "+84", maxLen: 9 },
    { name: "Wallis and Futuna", code: "WF", dial_code: "+681", maxLen: 6 },
    { name: "Western Sahara", code: "EH", dial_code: "+212", maxLen: 9 },
    { name: "Yemen", code: "YE", dial_code: "+967", maxLen: 9 },
    { name: "Zambia", code: "ZM", dial_code: "+260", maxLen: 9 },
    { name: "Zimbabwe", code: "ZW", dial_code: "+263", maxLen: 9 },
];

export interface PhoneInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string;
    onValueChange: (value: string) => void;
    onCountryChange?: (countryName: string) => void;
}

export function PhoneInput({ className, value, onValueChange, onCountryChange, ...props }: PhoneInputProps) {
    const [open, setOpen] = React.useState(false);

    // Derive country from the value (if it starts with +)
    const [selectedCountry, setSelectedCountry] = React.useState(() => {
        if (!value) return countries.find(c => c.code === "US")!;
        // Try to match dial code - sort by length descending to match longest code first
        const sortedCountries = [...countries].sort((a, b) => b.dial_code.length - a.dial_code.length);
        const country = sortedCountries.find(c => value.startsWith(c.dial_code) || value.startsWith(c.dial_code.split(',')[0]));
        return country || countries.find(c => c.code === "US")!;
    });

    // Effect to notify parent of initial/derived country
    React.useEffect(() => {
        if (onCountryChange) {
            onCountryChange(selectedCountry.name);
        }
    }, [selectedCountry, onCountryChange]);


    // Extract phone number without the dial code
    const phoneNumber = React.useMemo(() => {
        if (!value) return "";
        let clean = value;
        // Check if it starts with current country dial code
        const codes = selectedCountry.dial_code.split(',').map(s => s.trim());
        for (const code of codes) {
            if (value.startsWith(code)) {
                // Remove code and maybe a space
                return value.substring(code.length).trim();
            }
        }
        return value;
    }, [value, selectedCountry]);

    const handleCountrySelect = (country: typeof countries[0]) => {
        setSelectedCountry(country);
        setOpen(false);
        // Update parent value with new code - keep existing number but trim if needed
        const code = country.dial_code.split(',')[0].trim();
        // Enforce max length on change? optionally truncate or just let it be invalid until edited
        onValueChange(`${code} ${phoneNumber}`);
    };

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = e.target.value.replace(/\D/g, ''); // Remove non-digits

        // Enforce Max Length
        if (selectedCountry.maxLen && num.length > selectedCountry.maxLen) {
            return; // Ignore input
        }

        const code = selectedCountry.dial_code.split(',')[0].trim();
        // Reconstruct full value
        onValueChange(`${code} ${num}`);
    };

    return (
        <div className={cn("flex", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-[140px] justify-between rounded-r-none border-r-0 px-3 font-normal"
                    >
                        <span className="flex items-center gap-2 truncate">
                            <span className="text-lg leading-none">{getFlag(selectedCountry.code)}</span>
                            <span className="text-muted-foreground">{selectedCountry.code}</span>
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search country..." />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                                {countries.map((country) => (
                                    <CommandItem
                                        key={country.code}
                                        value={`${country.name} ${country.code} ${country.dial_code}`}
                                        onSelect={() => handleCountrySelect(country)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <span className="mr-2 text-lg">{getFlag(country.code)}</span>
                                        <span className="flex-1">{country.name}</span>
                                        <span className="ml-auto text-muted-foreground text-xs">{country.dial_code.split(',')[0]}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            <Input
                {...props}
                className={cn("rounded-l-none", className)}
                value={phoneNumber}
                onChange={handleNumberChange}
                placeholder="Phone number"
            />
        </div>
    );
}

// Simple utility to get flag emoji
function getFlag(countryCode: string) {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}
