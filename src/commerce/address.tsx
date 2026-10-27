import { useState } from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { addressSchema, type Address } from "./contracts";
export const emptyAddress: Address = {
  recipient: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "MG",
  reference: "",
};
export function AddressFields({
  register,
  errors,
  prefix = "",
  lookup,
}: {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  prefix?: string;
  lookup?: () => void;
}) {
  const fields = [
    ["recipient", "Quem vai receber", "name"],
    ["cep", "CEP", "postal-code"],
    ["street", "Rua / avenida", "address-line1"],
    ["number", "Número ou S/N", "off"],
    ["complement", "Complemento (opcional)", "address-line2"],
    ["neighborhood", "Bairro", "address-level3"],
    ["city", "Cidade", "address-level2"],
    ["reference", "Referência (opcional)", "off"],
  ];
  function message(name: string) {
    const root = prefix
      ? (errors[prefix] as Record<string, { message?: unknown }>)
      : errors;
    const m = root?.[name]?.message;
    return typeof m === "string" ? m : null;
  }
  return (
    <div className="account-fields">
      {fields.map(([key, label, complete]) => (
        <label
          key={key}
          className={
            key === "street" || key === "recipient" || key === "reference"
              ? "wide"
              : ""
          }
        >
          {label}
          <input
            {...register(prefix ? `${prefix}.${key}` : key)}
            autoComplete={complete}
            inputMode={key === "cep" ? "numeric" : undefined}
            maxLength={
              key === "cep"
                ? 9
                : key === "number"
                  ? 20
                  : key === "reference"
                    ? 160
                    : 120
            }
            aria-invalid={!!message(key)}
            onBlur={key === "cep" && lookup ? lookup : undefined}
          />
          {message(key) && <small role="alert">{message(key)}</small>}
        </label>
      ))}
      <label>
        Estado
        <select {...register(prefix ? `${prefix}.state` : "state")}>
          {addressSchema.shape.state.options.map((uf) => (
            <option key={uf}>{uf}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
export function useCep(apply: (values: Partial<Address>) => void) {
  const [hint, setHint] = useState("");
  async function lookup(value: string) {
    const cep = value.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setHint("Consultando CEP…");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.erro) throw new Error();
      apply({
        cep,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf,
      });
      setHint("Confira o endereço e preencha o número.");
    } catch {
      setHint(
        "Não foi possível consultar o CEP. Você pode preencher o endereço abaixo.",
      );
    }
  }
  return { lookup, hint };
}
