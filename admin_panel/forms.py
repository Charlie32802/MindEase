"""
📌 NOTES FOR TEAM — PLEASE READ

This file (admin_panel/forms.py) is the "reception desk" of our admin panel.  
It handles how users register and how admins log in. Think of it as the place 
that checks IDs and gives access to the control room.

🔹 What this file does:
- UserRegistrationForm: controls how normal users are created and stored.
- EmailAuthenticationForm: controls admin login and blocks non-admin roles.
- Ensures only admins (superusers) can log in here, while regular users cannot.

🔹 What you should NOT do:
- Don’t allow non-admin roles to bypass this form.
- Don’t rename this file or move it outside admin_panel → imports will break.
- Don’t add unrelated forms here — this is only for admin panel authentication.

🔹 How you should FEEL about this file:
This is the first line of defense for the admin panel.  
It quietly ensures that only authorized users enter the control tower.  
Respect it, and it keeps MindEase safe and organized. ❤️
"""

from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import authenticate
from accounts.models import User


class EmailAuthenticationForm(AuthenticationForm):
    """Admin login form - validates only email/password"""
    username = forms.EmailField(
        label="Email",
        widget=forms.EmailInput(attrs={
            "autofocus": True,
            "placeholder": "Enter your email"
        })
    )

    def clean(self):
        email = self.cleaned_data.get("username")
        password = self.cleaned_data.get("password")

        if email and password:
            self.user_cache = authenticate(
                self.request,
                username=email,
                password=password
            )

            if self.user_cache is None:
                # Reset BOTH fields
                self.cleaned_data["username"] = ""
                self.cleaned_data["password"] = ""

                if not User.objects.filter(email=email).exists():
                    self.add_error("username", "The email you entered is incorrect")
                else:
                    self.add_error(None, "Invalid email or password")

        return self.cleaned_data