import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  config: {
    initialColorMode: "light",
  },

  colors: {
    primary: {
      "50": "#EEF5F7",
      "100": "#CFE4E8",
      "200": "#B0D3D9",
      "300": "#91C1CA",
      "400": "#72B0BA",
      "500": "#549EAB",
      "600": "#437F89",
      "700": "#325F67",
      "800": "#213F45",
      "900": "#112022",
    },
    secondary: {
      "50": "#F8F5EC",
      "100": "#EDE4CA",
      "200": "#E1D2A8",
      "300": "#D5C086",
      "400": "#C9AF64",
      "500": "#BD9D42",
      "600": "#977E35",
      "700": "#715E28",
      "800": "#4C3F1A",
      "900": "#261F0D",
    },
  },

  fonts: {
    body: "Nunito, sans-serif",
    heading: "Momcake",
  },

  components: {
    Button: {
      variants: {
        primaryOutline: {
          fontWeight: 600,
          color: "primary.500",
          rounded: "2xl",
          borderWidth: { base: 1, md: 3 },
          borderColor: "primary.400",
        },
      },
    },
  },
});

export default theme;
