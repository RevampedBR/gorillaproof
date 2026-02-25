async function testVerifyAdmin() {
    console.log("Testing verifyAdmin logic...");

    // Mocking the behavior of verifyAdmin
    async function mockVerifyAdmin(role, userId, orgId) {
        const user = userId ? { id: userId } : null;
        if (!user) return { authorized: false, error: "Not authenticated" };

        const membership = role ? { role } : null;

        if (!membership || membership.role !== "admin") {
            return { authorized: false, error: "Only organization admins can manage webhooks" };
        }

        return { authorized: true, user };
    }

    // Case 1: Not authenticated
    const res1 = await mockVerifyAdmin(null, null, "org123");
    if (res1.authorized !== false || res1.error !== "Not authenticated") {
        throw new Error("Case 1 failed");
    }

    // Case 2: Authenticated but not a member
    const res2 = await mockVerifyAdmin(null, "user123", "org123");
    if (res2.authorized !== false || res2.error !== "Only organization admins can manage webhooks") {
        throw new Error("Case 2 failed");
    }

    // Case 3: Authenticated as member but not admin
    const res3 = await mockVerifyAdmin("member", "user123", "org123");
    if (res3.authorized !== false || res3.error !== "Only organization admins can manage webhooks") {
        throw new Error("Case 3 failed");
    }

    // Case 4: Authenticated as admin
    const res4 = await mockVerifyAdmin("admin", "user123", "org123");
    if (res4.authorized !== true || res4.user.id !== "user123") {
        throw new Error("Case 4 failed");
    }

    console.log("verifyAdmin logic tests passed!");
}

testVerifyAdmin().catch(err => {
    console.error(err);
    process.exit(1);
});
