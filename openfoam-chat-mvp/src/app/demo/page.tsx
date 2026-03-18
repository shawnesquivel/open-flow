import { Workspace } from "@/components/farm-flow-workspace";
import { demoImages } from "@/lib/demo-assets";

export default async function Page() {
  return <Workspace assets={[...demoImages]} />;
}
