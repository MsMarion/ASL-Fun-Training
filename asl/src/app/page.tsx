import { Navbar } from "@/app/_components/navbar";
import { api, HydrateClient } from "~/trpc/server";
import { ElevenLabsDemo } from "@/app/_components/eleven-labs-demo";

export default async function Home() {
    return (
        <div className="">
            <HydrateClient>
                <Navbar></Navbar>

                <main className="flex flex-col items-center justify-center p-8">
                    <ElevenLabsDemo />
                </main>
            </HydrateClient>
        </div>
    );
}
