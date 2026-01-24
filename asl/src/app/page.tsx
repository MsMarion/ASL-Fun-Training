import Link from "next/link";

import { Navbar } from "@/app/_components/navbar";

import { api, HydrateClient } from "~/trpc/server";

export default async function Home() {
    return (
        <div className="">
            <HydrateClient>
                <Navbar></Navbar>



            </HydrateClient>


        </div>

    );
}