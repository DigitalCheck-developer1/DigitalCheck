import pathlib

def replace_checked(path, old, new):
    p = pathlib.Path(path)
    text = p.read_text()
    if old not in text:
        print("ATTENZIONE: non trovato in " + path)
        return
    p.write_text(text.replace(old, new, 1))
    print("OK: " + path)

# --- login/route.ts ---
replace_checked(
    "src/app/api/auth/login/route.ts",
    'import { createSessionToken, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";',
    'import { createSessionToken, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";\nimport { grantOwnerPrivilegesIfNeeded } from "@/lib/auth/owner";',
)
replace_checked(
    "src/app/api/auth/login/route.ts",
    '  const sessionToken = await createSessionToken({ userId: user.id, email: user.email, isAdmin: user.isAdmin });\n  const response = NextResponse.json({ id: user.id, email: user.email });',
    '  const currentUser = await grantOwnerPrivilegesIfNeeded(user);\n\n  const sessionToken = await createSessionToken({\n    userId: currentUser.id,\n    email: currentUser.email,\n    isAdmin: currentUser.isAdmin,\n  });\n  const response = NextResponse.json({ id: currentUser.id, email: currentUser.email });',
)

# --- register/route.ts ---
replace_checked(
    "src/app/api/auth/register/route.ts",
    'import { sendMail } from "@/lib/mail/mailer";',
    'import { sendMail } from "@/lib/mail/mailer";\nimport { grantOwnerPrivilegesIfNeeded } from "@/lib/auth/owner";',
)
replace_checked(
    "src/app/api/auth/register/route.ts",
    '  const sessionToken = await createSessionToken({ userId: user.id, email: user.email, isAdmin: user.isAdmin });\n  const response = NextResponse.json({\n    id: user.id,\n    email: user.email,',
    '  const currentUser = await grantOwnerPrivilegesIfNeeded(user);\n\n  const sessionToken = await createSessionToken({\n    userId: currentUser.id,\n    email: currentUser.email,\n    isAdmin: currentUser.isAdmin,\n  });\n  const response = NextResponse.json({\n    id: currentUser.id,\n    email: currentUser.email,',
)
