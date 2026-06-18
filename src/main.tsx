import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppDataProvider } from "@/state/AppDataProvider";
import { ItemsProvider } from "@/state/ItemsProvider";
import { SettingsProvider } from "@/state/SettingsProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TooltipProvider delay={200}>
      <SettingsProvider>
        <AppDataProvider>
          <ItemsProvider>
            <App />
          </ItemsProvider>
        </AppDataProvider>
      </SettingsProvider>
    </TooltipProvider>
  </React.StrictMode>,
);
