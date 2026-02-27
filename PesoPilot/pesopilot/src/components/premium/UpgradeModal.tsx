"use client";

import { useState, useRef } from "react";
import { Sparkles, X, Crown, Upload, QrCode, Smartphone, Copy, CheckCircle } from "lucide-react";
import { submitPremiumRequest } from "@/app/api/premium";
import { formatPeso } from "@/utils/currency";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GCASH_NUMBER = "0993 299 3066";
const PRICE = 199;

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [step, setStep] = useState<"payment" | "upload">("payment");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(GCASH_NUMBER.replace(/\s/g, ""));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setIsSubmitting(true);
    setSubmitStatus(null);

    const formData = new FormData();
    formData.append("payment_proof", selectedFile);

    const result = await submitPremiumRequest(formData);

    if (result.error) {
      setSubmitStatus({ success: false, message: result.error });
    } else {
      setSubmitStatus({ success: true, message: "Request submitted! We'll review your payment shortly." });
      setTimeout(() => {
        onClose();
        setStep("payment");
        setSelectedFile(null);
        setPreviewUrl(null);
        setSubmitStatus(null);
      }, 3000);
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    onClose();
    setStep("payment");
    setSelectedFile(null);
    setPreviewUrl(null);
    setSubmitStatus(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Unlock Lifetime Premium</h2>
          <p className="text-white/80 mt-2">One-time payment. Lifetime access.</p>
        </div>

        <button onClick={handleClose} className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {step === "payment" ? (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-900 dark:text-white">{formatPeso(PRICE)}</div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">One-time payment • No recurring fees</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Pay with GCash</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Send exactly {formatPeso(PRICE)}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 text-center">
                  <div className="w-40 h-40 mx-auto bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center mb-2">
                    <QrCode className="w-20 h-20 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">GCash QR Code (Placeholder)</p>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">GCash Number</p>
                    <p className="font-mono font-semibold text-gray-900 dark:text-white">{GCASH_NUMBER}</p>
                  </div>
                  <button onClick={handleCopyNumber} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                    {isCopied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h4 className="font-medium text-gray-900 dark:text-white">How to upgrade:</h4>
                <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 list-decimal list-inside">
                  <li>Open your GCash app</li>
                  <li>Scan the QR code or send to the number above</li>
                  <li>Pay exactly {formatPeso(PRICE)}</li>
                  <li>Take a screenshot of your payment receipt</li>
                  <li>Click below to upload your proof</li>
                </ol>
              </div>

              <button onClick={() => setStep("upload")} className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" />
                I&apos;ve Paid - Upload Proof
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upload Payment Proof</h3>

              {submitStatus?.success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-green-600 dark:text-green-400 font-medium">{submitStatus.message}</p>
                </div>
              ) : (
                <>
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 dark:hover:border-purple-400 transition-colors">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Payment proof preview" className="max-h-48 mx-auto rounded-lg" />
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-300 font-medium">Click to upload screenshot</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">JPG, PNG, or PDF (max 5MB)</p>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="hidden" />
                  </div>

                  {selectedFile && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 text-center">Selected: {selectedFile.name}</p>}
                  {submitStatus?.error && <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center">{submitStatus.message}</p>}

                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setStep("payment")} className="flex-1 py-3 px-4 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium rounded-xl transition-colors">Back</button>
                    <button onClick={handleSubmit} disabled={!selectedFile || isSubmitting} className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
