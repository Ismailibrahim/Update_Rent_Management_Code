"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Loader2,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const initialFormState = {
  propertyId: "",
  unitTypeId: "",
  unitNumber: "",
  rentAmount: "",
  securityDeposit: "",
  isOccupied: false,
};

export default function NewUnitPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const [propertyOptions, setPropertyOptions] = useState([]);
  const [propertyOptionsError, setPropertyOptionsError] = useState(null);
  const [unitTypeOptions, setUnitTypeOptions] = useState([]);
  const [unitTypeOptionsError, setUnitTypeOptionsError] = useState(null);
  const [selectedDepositMultiplier, setSelectedDepositMultiplier] =
    useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProperties() {
      setPropertyOptionsError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          setPropertyOptionsError("Log in to load the property list.");
          return;
        }

        const url = new URL(`${API_BASE_URL}/properties`);
        url.searchParams.set("per_page", "100");

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load properties (HTTP ${response.status}).`;
          setPropertyOptionsError(message);
          return;
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        const options = data
          .map((property) => ({
            value: String(property.id),
            label: property.name ?? `Property #${property.id ?? "?"}`,
          }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
          );

        setPropertyOptions(options);
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setPropertyOptionsError(
          "Could not load properties. Check your API connection.",
        );
      }
    }

    fetchProperties();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchUnitTypes() {
      setUnitTypeOptionsError(null);

      try {
        const token = localStorage.getItem("auth_token");

        if (!token) {
          setUnitTypeOptionsError("Log in to load unit types.");
          return;
        }

        const url = new URL(`${API_BASE_URL}/unit-types`);
        url.searchParams.set("per_page", "100");

        const response = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          const message =
            payload?.message ??
            `Unable to load unit types (HTTP ${response.status}).`;
          setUnitTypeOptionsError(message);
          return;
        }

        const payload = await response.json();
        const data = Array.isArray(payload?.data) ? payload.data : [];

        const options = data
          .filter((type) => type?.id)
          .map((type) => ({
            value: String(type.id),
            label: type.name ?? `Type #${type.id ?? "?"}`,
            isActive: type.is_active !== false,
          }))
          .filter((option) => option.isActive)
          .map(({ value, label }) => ({ value, label }))
          .sort((a, b) =>
            a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
          );

        setUnitTypeOptions(options);
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setUnitTypeOptionsError(
          "Could not load unit types. Check your API connection.",
        );
      }
    }

    fetchUnitTypes();

    return () => controller.abort();
  }, []);

  const sortedPropertyOptions = useMemo(
    () =>
      [...propertyOptions].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      ),
    [propertyOptions],
  );

  const sortedUnitTypeOptions = useMemo(
    () =>
      [...unitTypeOptions].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      ),
    [unitTypeOptions],
  );

  const securityDepositOptions = useMemo(
    () => [
      { label: "1 Month", value: 1 },
      { label: "2 Month", value: 2 },
      { label: "3 Month", value: 3 },
    ],
    [],
  );

  const fieldKeyMap = useMemo(
    () => ({
      propertyId: "property_id",
      unitTypeId: "unit_type_id",
      unitNumber: "unit_number",
      rentAmount: "rent_amount",
      securityDeposit: "security_deposit",
      isOccupied: "is_occupied",
    }),
    [],
  );

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setValidationErrors((prev) => {
      if (!prev) {
        return prev;
      }

      const next = { ...prev };
      const apiKey = fieldKeyMap[name] ?? name;
      delete next[apiKey];
      return next;
    });
  };

  const handleDepositMultiplierChange = (value, isChecked) => {
    setSelectedDepositMultiplier((prev) => {
      if (isChecked) {
        return value;
      }

      if (prev === value) {
        return null;
      }

      return prev;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    setApiError(null);
    setValidationErrors({});

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("Please log in before creating a unit.");
      }

      const payload = {};

      if (form.propertyId) {
        payload.property_id = Number(form.propertyId);
      }

      if (form.unitTypeId) {
        payload.unit_type_id = Number(form.unitTypeId);
      }

      if (form.unitNumber.trim().length > 0) {
        payload.unit_number = form.unitNumber.trim();
      }

      if (form.rentAmount !== "") {
        payload.rent_amount = Number(form.rentAmount);
      }

      if (form.securityDeposit !== "") {
        payload.security_deposit = Number(form.securityDeposit);
      } else {
        payload.security_deposit = null;
      }

      payload.is_occupied = Boolean(form.isOccupied);

      const response = await fetch(`${API_BASE_URL}/units`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 422) {
        const validationPayload = await response.json();
        setValidationErrors(validationPayload?.errors ?? {});
        throw new Error(validationPayload?.message ?? "Validation error.");
      }

      if (!response.ok) {
        const apiPayload = await response.json().catch(() => ({}));
        const message =
          apiPayload?.message ??
          `Could not create unit (HTTP ${response.status}).`;
        throw new Error(message);
      }

      const result = await response.json().catch(() => null);
      const unit = result?.data ?? result ?? {};
      const createdUnitId = unit?.id;

      setSuccess(true);
      setForm(initialFormState);

      setTimeout(() => {
        if (createdUnitId) {
          router.push(`/units/${createdUnitId}`);
        } else {
          router.push("/units");
        }
        router.refresh();
      }, 1200);
    } catch (error) {
      setApiError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!selectedDepositMultiplier) {
      setForm((prev) => {
        if (prev.securityDeposit === "") {
          return prev;
        }

        return {
          ...prev,
          securityDeposit: "",
        };
      });

      return;
    }

    setForm((prev) => {
      const rentValue = Number(prev.rentAmount);

      if (!Number.isFinite(rentValue) || rentValue <= 0) {
        if (prev.securityDeposit === "") {
          return prev;
        }

        return {
          ...prev,
          securityDeposit: "",
        };
      }

      const computed = rentValue * selectedDepositMultiplier;
      const nextValue = String(computed);

      if (prev.securityDeposit === nextValue) {
        return prev;
      }

      return {
        ...prev,
        securityDeposit: nextValue,
      };
    });
  }, [selectedDepositMultiplier, form.rentAmount]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/units"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft size={18} />
          <span className="sr-only">Back to units</span>
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Layers size={24} className="text-primary" />
            Add a unit
          </h1>
          <p className="text-sm text-slate-600">
            Create a new unit and assign it to a property in your portfolio.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur">
        {apiError ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
            <p>{apiError}</p>
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-700">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
            <p>Unit created successfully. Redirecting…</p>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          suppressHydrationWarning
        >
          <Fieldset>
            <Label htmlFor="propertyId">Property</Label>
            <select
              id="propertyId"
              name="propertyId"
              value={form.propertyId}
              onChange={handleChange}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-describedby={
                validationErrors.property_id ? "property-error" : undefined
              }
              suppressHydrationWarning
            >
              <option value="">Select a property…</option>
              {sortedPropertyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {validationErrors.property_id ? (
              <FieldError id="property-error">
                {validationErrors.property_id[0]}
              </FieldError>
            ) : null}
            {propertyOptionsError ? (
              <p className="text-xs text-amber-600">{propertyOptionsError}</p>
            ) : null}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="unitTypeId">Unit type</Label>
            <select
              id="unitTypeId"
              name="unitTypeId"
              value={form.unitTypeId}
              onChange={handleChange}
              disabled={submitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              aria-describedby={
                validationErrors.unit_type_id ? "unit-type-error" : undefined
              }
              suppressHydrationWarning
            >
              <option value="">Select a unit type…</option>
              {sortedUnitTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {validationErrors.unit_type_id ? (
              <FieldError id="unit-type-error">
                {validationErrors.unit_type_id[0]}
              </FieldError>
            ) : null}
            {unitTypeOptionsError ? (
              <p className="text-xs text-amber-600">{unitTypeOptionsError}</p>
            ) : null}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="unitNumber">Unit number</Label>
            <Input
              id="unitNumber"
              name="unitNumber"
              placeholder="A-101"
              value={form.unitNumber}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={
                validationErrors.unit_number ? "unit-number-error" : undefined
              }
              suppressHydrationWarning
            />
            {validationErrors.unit_number ? (
              <FieldError id="unit-number-error">
                {validationErrors.unit_number[0]}
              </FieldError>
            ) : null}
          </Fieldset>

          <Fieldset>
            <Label htmlFor="rentAmount">Monthly rent (MVR)</Label>
            <Input
              id="rentAmount"
              name="rentAmount"
              type="number"
              min="0"
              step="1"
              placeholder="15000"
              value={form.rentAmount}
              onChange={handleChange}
              disabled={submitting}
              aria-describedby={
                validationErrors.rent_amount ? "rent-amount-error" : undefined
              }
              suppressHydrationWarning
            />
            {validationErrors.rent_amount ? (
              <FieldError id="rent-amount-error">
                {validationErrors.rent_amount[0]}
              </FieldError>
            ) : null}
          </Fieldset>

  <Fieldset>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label htmlFor="securityDeposit">Security deposit (MVR)</Label>
              <div className="flex items-center gap-3">
                {securityDepositOptions.map((option) => (
                  <label
                    key={option.value}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                      checked={selectedDepositMultiplier === option.value}
                      onChange={(event) =>
                        handleDepositMultiplierChange(
                          option.value,
                          event.target.checked,
                        )
                      }
                      disabled={submitting}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <Input
              id="securityDeposit"
              name="securityDeposit"
              type="number"
              min="0"
              step="1"
              placeholder="20000"
              value={form.securityDeposit}
              onChange={handleChange}
              disabled={submitting}
              readOnly={selectedDepositMultiplier !== null}
              aria-describedby={
                validationErrors.security_deposit
                  ? "security-deposit-error"
                  : undefined
              }
              suppressHydrationWarning
            />
            {validationErrors.security_deposit ? (
              <FieldError id="security-deposit-error">
                {validationErrors.security_deposit[0]}
              </FieldError>
            ) : null}
          </Fieldset>

          <Fieldset>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                name="isOccupied"
                checked={form.isOccupied}
                onChange={handleChange}
                disabled={submitting}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                suppressHydrationWarning
              />
              Mark as occupied
            </label>
            {validationErrors.is_occupied ? (
              <FieldError id="occupied-error">
                {validationErrors.is_occupied[0]}
              </FieldError>
            ) : null}
          </Fieldset>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/units"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Layers size={16} />
                  Create unit
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Fieldset({ children }) {
  return <div className="space-y-1.5">{children}</div>;
}

function Label({ children, ...props }) {
  return (
    <label {...props} className="text-sm font-semibold text-slate-700">
      {children}
    </label>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    />
  );
}

function FieldError({ id, children }) {
  return (
    <p id={id} className="text-xs font-medium text-red-500">
      {children}
    </p>
  );
}

