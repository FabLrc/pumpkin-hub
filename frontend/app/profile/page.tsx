"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Save,
  AlertCircle,
  Check,
  Upload,
  ImageIcon,
} from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { useCurrentUser } from "@/lib/hooks";
import { updateProfile, uploadAvatar, getAuthMePath } from "@/lib/api";
import { mutate } from "swr";

const DISPLAY_NAME_MAX = 100;
const BIO_MAX = 500;

const ALLOWED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

// ── Avatar Section ─────────────────────────────────────────────────────────

function AvatarSection({
  currentAvatarUrl,
}: {
  currentAvatarUrl: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(false);
    const file = e.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    if (!(ALLOWED_AVATAR_TYPES as readonly string[]).includes(file.type)) {
      setError("Only JPEG, PNG, WebP, and GIF images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setError(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 2 MB.`,
      );
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setError(null);
    setIsUploading(true);

    try {
      await uploadAvatar(selectedFile);
      await mutate(getAuthMePath());
      setSuccess(true);
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      const match = message.match(/"error":\s*"([^"]+)"/);
      setError(match ? match[1] : message);
    } finally {
      setIsUploading(false);
    }
  }

  const displayedImage = preview ?? currentAvatarUrl;

  return (
    <div className="border border-border-default bg-bg-elevated p-6">
      <h2 className="font-raleway font-bold text-sm text-text-primary tracking-wide uppercase mb-6">
        Avatar
      </h2>

      <div className="flex items-start gap-6">
        {/* Current / preview */}
        <div className="shrink-0">
          {displayedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayedImage}
              alt="Avatar preview"
              className="w-20 h-20 object-cover border border-border-default"
            />
          ) : (
            <div className="w-20 h-20 bg-bg-surface border border-border-default flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-text-dim" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-4">
          <div>
            <p className="font-mono text-xs text-text-muted mb-1">
              Upload a new avatar
            </p>
            <p className="font-mono text-[10px] text-text-dim">
              JPEG, PNG, WebP, or GIF · max 2 MB
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              id="avatar-upload"
              accept={ALLOWED_AVATAR_TYPES.join(",")}
              onChange={handleFileChange}
              className="sr-only"
            />
            <label
              htmlFor="avatar-upload"
              className="inline-flex items-center gap-2 px-4 py-2 border border-border-default hover:border-border-hover bg-bg-surface font-mono text-xs text-text-primary transition-colors cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {selectedFile ? selectedFile.name : "Choose file"}
            </label>

            {selectedFile && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-black font-mono text-xs font-bold tracking-wider uppercase hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 border border-error/30 bg-error/5 px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
              <p className="font-mono text-xs text-error">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 border border-success/30 bg-success/5 px-3 py-2">
              <Check className="w-3.5 h-3.5 text-success shrink-0" />
              <p className="font-mono text-xs text-success">
                Avatar updated successfully
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Profile Page ───────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form once user data loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name ?? "");
      setBio(user.bio ?? "");
    }
  }, [user]);

  // Redirect unauthenticated users
  if (!isLoading && !user) {
    router.replace("/auth");
    return null;
  }

  function validate(): string | null {
    if (displayName && displayName.length > DISPLAY_NAME_MAX) {
      return `Display name must be at most ${DISPLAY_NAME_MAX} characters`;
    }
    if (bio && bio.length > BIO_MAX) {
      return `Bio must be at most ${BIO_MAX} characters`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        display_name: displayName || undefined,
        bio: bio || undefined,
      });
      await mutate(getAuthMePath());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      const match = message.match(/"error":\s*"([^"]+)"/);
      setError(match ? match[1] : message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-text-dim hover:text-text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-accent flex items-center justify-center">
              <User className="w-5 h-5 text-black" />
            </div>
            <h1 className="font-raleway font-bold text-2xl text-text-primary tracking-wide">
              Profile
            </h1>
          </div>
          <p className="font-mono text-xs text-text-dim max-w-lg">
            Manage your public profile information. Changes are visible to
            everyone on Pumpkin Hub.
          </p>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-bg-surface border border-border-default animate-pulse"
              />
            ))}
          </div>
        ) : user ? (
          <div className="space-y-8">
            {/* Avatar upload */}
            <AvatarSection currentAvatarUrl={user.avatar_url ?? null} />

            {/* Read-only info */}
            <div className="border border-border-default bg-bg-elevated p-6 space-y-4">
              <h2 className="font-raleway font-bold text-sm text-text-primary tracking-wide uppercase mb-4">
                Account Info
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoField label="Username" value={`@${user.username}`} />
                <InfoField label="Email" value={user.email ?? "—"} />
                <InfoField label="Role" value={user.role} />
                <InfoField
                  label="Member since"
                  value={new Date(user.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                />
              </div>
            </div>

            {/* Editable form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border border-border-default bg-bg-elevated p-6 space-y-6">
                <h2 className="font-raleway font-bold text-sm text-text-primary tracking-wide uppercase">
                  Edit Profile
                </h2>

                {/* Display Name */}
                <div>
                  <label className="block font-mono text-xs text-text-muted mb-1.5">
                    Display Name
                    <span className="text-text-dim ml-2">
                      ({displayName.length}/{DISPLAY_NAME_MAX})
                    </span>
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={DISPLAY_NAME_MAX}
                    placeholder={user.username}
                    className="w-full bg-bg-surface border border-border-default px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block font-mono text-xs text-text-muted mb-1.5">
                    Bio
                    <span className="text-text-dim ml-2">
                      ({bio.length}/{BIO_MAX})
                    </span>
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={BIO_MAX}
                    rows={4}
                    placeholder="Tell us about yourself..."
                    className="w-full bg-bg-surface border border-border-default px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>


              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3">
                  <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <p className="font-mono text-xs text-error">{error}</p>
                </div>
              )}

              {/* Success message */}
              {success && (
                <div className="flex items-center gap-2 border border-success/30 bg-success/5 px-4 py-3">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <p className="font-mono text-xs text-success">
                    Profile updated successfully
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-black font-mono text-xs font-bold tracking-wider uppercase hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <dl>
      <dt className="font-mono text-[10px] text-text-dim uppercase tracking-wider">
        {label}
      </dt>
      <dd className="font-mono text-sm text-text-primary mt-0.5">{value}</dd>
    </dl>
  );
}
