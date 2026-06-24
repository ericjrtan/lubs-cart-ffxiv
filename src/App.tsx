import { UpdateBanner } from "@/components/UpdateBanner";
import { GlobalHeader } from "@/components/GlobalHeader";
import { CartView } from "@/views/CartView";
import { CraftingView } from "@/views/CraftingView";
import { CurrencyView } from "@/views/CurrencyView";
import { useSettings } from "@/state/SettingsProvider";

/**
 * App shell (SPEC v1.1 §3.1): a global header with the tab strip, then the active tool's
 * view. The Cart is unchanged from v1.0; Crafting and Currency are new tabs.
 */
function App() {
  const { settings } = useSettings();
  const { activeTab } = settings;

  return (
    <div className="flex h-screen flex-col bg-background bg-[radial-gradient(125%_85%_at_50%_-15%,#3a1d22_0%,transparent_55%)] text-foreground">
      <UpdateBanner />
      <GlobalHeader />

      {activeTab === "cart" && <CartView />}
      {activeTab === "crafting" && <CraftingView />}
      {activeTab === "currency" && <CurrencyView />}

      <footer className="border-t px-5 py-2 text-center text-[11px] text-muted-foreground">
        Unofficial. Not affiliated with or endorsed by Square Enix. FINAL FANTASY XIV ©
        SQUARE ENIX CO., LTD.
      </footer>
    </div>
  );
}

export default App;
