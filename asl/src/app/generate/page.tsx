import {Navbar} from "@/app/_components/navbar";
import { api, HydrateClient } from "~/trpc/server";


export default async function Generate() {
  return (
    <div className="">
       <HydrateClient>
            <Navbar></Navbar>
      
      
      
            </HydrateClient>

    </div>
    
  );
}
