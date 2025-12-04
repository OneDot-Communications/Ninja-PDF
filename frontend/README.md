This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

- **PDF Tools**: Comprehensive PDF processing tools including merge, split, compress, protect, watermark, sign, and more
- **PDF Protection**: Secure PDF encryption using iLovePDF API (requires API key setup)
- **Modern UI**: Built with Next.js 16, React 19, and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Divith123/Ninja-Reader.git
cd Ninja-Reader
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your iLovePDF API credentials:
```env
NEXT_PUBLIC_ILOVEPDF_PUBLIC_KEY=your_public_key_here
NEXT_PUBLIC_ILOVEPDF_SECRET_KEY=your_secret_key_here
```

### Get iLovePDF API Keys

1. Sign up at [iLoveAPI](https://www.iloveapi.com/signup)
2. Create a new project in your dashboard
3. Copy your Public Key and Secret Key
4. Add them to your `.env.local` file

**Note**: PDF protection feature requires valid iLovePDF API credentials. Without them, the protect PDF tool will show an error message.

### Development

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## PDF Tools

### Available Tools
- **Merge PDF**: Combine multiple PDFs into one
- **Split PDF**: Divide PDFs into separate files
- **Compress PDF**: Reduce file size while maintaining quality
- **Protect PDF**: Encrypt PDFs with passwords (requires iLovePDF API)
- **Unlock PDF**: Remove password protection
- **Watermark PDF**: Add text or image watermarks
- **Sign PDF**: Add visual signatures
- **Crop PDF**: Trim PDF margins
- **Rotate PDF**: Change page orientation
- **Repair PDF**: Fix corrupted PDFs
- **Page Numbers**: Add page numbering
- **Organize PDF**: Reorder PDF pages
- **Convert PDF**: PDF to various formats

### API Integration

The PDF protection feature uses the iLovePDF API for server-side PDF encryption since browser-based encryption is not supported for security reasons.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
