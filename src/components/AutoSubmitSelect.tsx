"use client";

// A <select> that submits its enclosing GET form the moment the value
// changes — used for the "which activity am I looking at" picker so
// switching activities in the field doesn't need a second tap on a button.
export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      onChange={(e) => {
        e.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
