import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { AddressFields, emptyAddress, useCep } from "./address";
import { api, errorMessage, post } from "./client";
import { addressSchema, profileSchema, type Address } from "./contracts";
import { useCommerce } from "./CommerceProvider";
import { AccountShell, Busy, Notice, Protected } from "./ui";
import { useResource } from "./useResource";
export function ProfilePage() {
  return (
    <Protected>
      <Profile />
    </Protected>
  );
}
function Profile() {
  const { session } = useCommerce();
  const resource = useResource<{
    profile: { name: string; phone: string };
    addresses: Address[];
  }>("profile");
  const [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const profile = useForm<{ name: string; phone: string }>();
  const address = useForm<Address>({ defaultValues: emptyAddress });
  const cep = useCep(
    (values) => {
      for (const [key, value] of Object.entries(values))
        address.setValue(key as keyof Address, value);
    },
    () => address.getValues(),
  );
  useEffect(() => {
    if (resource.data) profile.reset(resource.data.profile);
  }, [resource.data, profile.reset]);
  async function saveProfile(values: { name: string; phone: string }) {
    setNotice("");
    setError("");
    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      for (const [index, i] of parsed.error.issues.entries())
        profile.setError(
          i.path[0] as "name" | "phone",
          { message: i.message },
          { shouldFocus: index === 0 },
        );
      return;
    }
    try {
      await api("profile", {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      });
      setNotice("Seus dados foram salvos.");
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function saveAddress(values: Address) {
    setNotice("");
    setError("");
    const parsed = addressSchema.safeParse(values);
    if (!parsed.success) {
      for (const [index, i] of parsed.error.issues.entries())
        address.setError(
          i.path[0] as keyof Address,
          { message: i.message },
          { shouldFocus: index === 0 },
        );
      return;
    }
    try {
      await post("addresses", parsed.data);
      await resource.reload();
      address.reset(emptyAddress);
      setNotice(
        "Endereço salvo. Pedidos anteriores continuam com o endereço original.",
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <AccountShell
      title="Meus dados."
      intro="Menos preenchimento na próxima escolha."
    >
      {resource.loading ? (
        <Busy />
      ) : resource.error ? (
        <>
          <Notice error>{resource.error}</Notice>
          <button
            className="account-button"
            onClick={() => void resource.reload()}
          >
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          {notice && <Notice>{notice}</Notice>}
          {error && <Notice error>{error}</Notice>}
          <div className="account-two-columns">
            <section className="account-card">
              <h2>Sobre você.</h2>
              <form onSubmit={profile.handleSubmit(saveProfile)} noValidate>
                <label>
                  Nome
                  <input autoComplete="name" {...profile.register("name")} />
                  {profile.formState.errors.name && (
                    <small role="alert">
                      {profile.formState.errors.name.message}
                    </small>
                  )}
                </label>
                <label>
                  E-mail
                  <input readOnly value={session.user?.email ?? ""} />
                </label>
                <label>
                  WhatsApp
                  <input
                    type="tel"
                    autoComplete="tel"
                    {...profile.register("phone")}
                  />
                  {profile.formState.errors.phone && (
                    <small role="alert">
                      {profile.formState.errors.phone.message}
                    </small>
                  )}
                </label>
                <button
                  className="account-button primary"
                  disabled={profile.formState.isSubmitting}
                >
                  Salvar meus dados
                </button>
              </form>
            </section>
            <section className="account-card">
              <h2>Seus endereços.</h2>
              {resource.data?.addresses.map((a) => (
                <button
                  className="address-choice"
                  key={a.id}
                  onClick={() => address.reset(a)}
                >
                  <strong>{a.recipient}</strong>
                  <span>
                    {a.street}, {a.number} — {a.city}/{a.state}
                  </span>
                  <small>Editar endereço</small>
                </button>
              ))}
              <form onSubmit={address.handleSubmit(saveAddress)} noValidate>
                <AddressFields
                  register={address.register}
                  errors={address.formState.errors}
                  lookup={() => void cep.lookup(address.getValues("cep"))}
                />
                {cep.hint && <Notice>{cep.hint}</Notice>}
                <div className="account-actions">
                  <button
                    className="account-button primary"
                    disabled={address.formState.isSubmitting}
                  >
                    Salvar endereço
                  </button>
                  <button
                    type="button"
                    className="account-button"
                    onClick={() => address.reset(emptyAddress)}
                  >
                    Novo endereço
                  </button>
                </div>
              </form>
            </section>
          </div>
        </>
      )}
    </AccountShell>
  );
}
