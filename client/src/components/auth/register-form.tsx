import { Input } from "@/components/shadcn-ui/input";
import { Label } from "@/components/shadcn-ui/label";
import { registerAction } from "@/actions/auth-actions";
import { AuthForm } from "./auth-form";
import { PasswordField } from "./password-field";

const USERNAME_ID = "username";

export function RegisterForm() {
    return (
        <AuthForm type="register" action={registerAction}>
            <Label htmlFor={USERNAME_ID}>Username</Label>
            <Input
                id={USERNAME_ID}
                name={USERNAME_ID}
                placeholder="Choose a username"
                required
            />

            <PasswordField confirmPassword />
        </AuthForm>
    );
}