// frontend/app/context/__tests__/AuthContext.test.tsx

import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import { api } from "../../lib/api";

jest.mock("../../lib/api");

const mockedApi = api as jest.Mocked<typeof api>;

const TestComponent = () => {
    const { user, loading, signup, login, logout, verifyOtp } = useAuth();
    return (
        <div>
            {loading ? "loading" : user ? user.email : "no user"}
            <button onClick={() => signup("test@example.com", "password", "First", "Last")}>Signup</button>
            <button onClick={() => login("test@example.com", "password")}>Login</button>
            <button onClick={() => logout()}>Logout</button>
            <button onClick={() => verifyOtp("test@example.com", "123456")}>Verify OTP</button>
        </div>
    );
};

describe("AuthContext", () => {
    beforeEach(() => {
        mockedApi.signup.mockResolvedValue({ otp_sent: true });
        mockedApi.login.mockResolvedValue({ email: "test@example.com", is_verified: true });
        mockedApi.verifyOtp.mockResolvedValue({});
        mockedApi.request.mockResolvedValue({ email: "test@example.com", is_verified: true });
        mockedApi.logout.mockResolvedValue({});
    });

    test("initial state shows loading then no user", async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        expect(screen.getByText("loading")).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText("no user")).toBeInTheDocument());
    });

    test("signup triggers API and stays unauthenticated until verification", async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        await waitFor(() => expect(screen.getByText("no user")).toBeInTheDocument());
        screen.getByText("Signup").click();
        await waitFor(() => expect(mockedApi.signup).toHaveBeenCalledWith("test@example.com", "password", "First", "Last"));
        // Ensure the signup returned the otp_sent flag when mocked
        // Since TestComponent doesn't display the response, just call signup directly via the provider
        const TestCall = () => {
            const { signup } = useAuth();
            (async () => {
                const r = await signup("test@example.com", "password", "First", "Last");
                expect(r).toEqual({ otp_sent: true });
            })();
            return null;
        };
        render(
            <AuthProvider>
                <TestCall />
            </AuthProvider>
        );
        // user still null after signup
        expect(screen.getByText("no user")).toBeInTheDocument();
    });

    test("login updates user state", async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        await waitFor(() => expect(screen.getByText("no user")).toBeInTheDocument());
        screen.getByText("Login").click();
        await waitFor(() => expect(mockedApi.login).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByText("test@example.com")).toBeInTheDocument());
    });

    test("logout clears user", async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );
        await waitFor(() => expect(screen.getByText("no user")).toBeInTheDocument());
        // simulate login first
        screen.getByText("Login").click();
        await waitFor(() => expect(screen.getByText("test@example.com")).toBeInTheDocument());
        screen.getByText("Logout").click();
        await waitFor(() => expect(mockedApi.logout).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByText("no user")).toBeInTheDocument());
    });
});
