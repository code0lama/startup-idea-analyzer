"use client";

import { useState, type FormEvent } from "react";
import { IdeaInputSchema, type IdeaInput } from "@/lib/analyses/schema";
import { Field } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Spinner } from "./ui/spinner";

type FieldErrors = Partial<Record<keyof IdeaInput, string>>;

export function AnalysisForm({
  initialValues,
  submitLabel = "Analyze idea",
  pending = false,
  error = null,
  onSubmit,
  onCancel,
}: {
  initialValues?: IdeaInput;
  submitLabel?: string;
  pending?: boolean;
  error?: string | null;
  onSubmit: (input: IdeaInput) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [targetMarket, setTargetMarket] = useState(
    initialValues?.targetMarket ?? "",
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = IdeaInputSchema.safeParse({ name, description, targetMarket });
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof IdeaInput;
        if (key && !nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field label="Startup name" htmlFor="name" error={errors.name}>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Analytics"
          disabled={pending}
          maxLength={120}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        error={errors.description}
        hint="One short paragraph: what it does and for whom."
      >
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe the idea in a sentence or two."
          disabled={pending}
          maxLength={2000}
        />
      </Field>

      <Field label="Target market" htmlFor="targetMarket" error={errors.targetMarket}>
        <Input
          id="targetMarket"
          value={targetMarket}
          onChange={(e) => setTargetMarket(e.target.value)}
          placeholder="e.g. SMB e-commerce teams"
          disabled={pending}
          maxLength={300}
        />
      </Field>

      {error && (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Spinner className="h-4 w-4" />}
          {pending ? "Analyzing…" : submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
