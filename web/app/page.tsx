"use client";
import { SignInButton } from "@clerk/nextjs";
import React, { useEffect, useState } from "react";
import axios from "axios";

const Page = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_CONVEX_URL}/api/query`,
          {
            path: "users:getUserByClerkId", // convex function path
            args: {
              clerkId:"user_32Y63mnwNDAJAQJEz1GBsysu8Jx"
            },
          }
        );
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="h-screen w-full flex flex-col justify-center items-center">
      {/* <SignInButton mode="modal" /> */}
      <div className="mt-4 max-w-[400px] overflow-auto">
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <pre>{JSON.stringify(users, null, 2)}</pre>
        )}
      </div>
    </div>
  );
};

export default Page;
