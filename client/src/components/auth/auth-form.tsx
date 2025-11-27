"use client"

import { ErrorMessage } from "@/components/error/error-message"
import { AuthBtn } from "./auth-btn"
import { useFormState } from "react-dom"

type FormState = { error?: string } | null
type AuthServerAction = (prevState: FormState, formData: FormData) => Promise<FormState>

type AuthFormProps = {
    children: React.ReactNode
    type: "login" | "register"
    action: AuthServerAction
}

export function AuthForm({ children, type, action }: AuthFormProps) {
    const [state, formAction] = useFormState<FormState, FormData>(action, null)

    return (
        <form action={formAction}>
            <div className="grid w-full items-center gap-4">
                <div className="flex flex-col space-y-1.5">
                    {children}
                </div>
            </div>

            {state?.error && <ErrorMessage message={state.error} />}

            <div className="flex flex-col gap-2 mt-4 justify-between items-center">
                <AuthBtn>{type === "login" ? "Login" : "Register"}</AuthBtn>
                {type === "login" && (
                    <a href="/register" className="text-sm text-muted-foreground">
                        Don't have an account?
                    </a>
                )}
                {type === "register" && (
                    <a href="/login" className="text-sm text-muted-foreground">
                        Already have an account? Login
                    </a>
                )}
            </div>
        </form>
    );
}
