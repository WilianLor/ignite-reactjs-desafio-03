import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  useEffect(() => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  }, [cart]);

  const addProduct = async (productId: number) => {
    try {
      const productResponse = await api.get(`/products/${productId}`);
      const product = productResponse.data;

      if (!product) {
        toast.error("Erro na adição do produto");
        return;
      }

      const stockResponse = await api.get(`/stock/${productId}`);
      const stock: Stock = stockResponse.data;

      if (stock.amount < 1) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const AlreadyOnCart = cart.find((product) => product.id === productId);

      if (AlreadyOnCart) {
        await updateProductAmount({
          productId,
          amount: AlreadyOnCart.amount + 1,
        });
      } else {
        setCart([
          ...cart,
          {
            ...product,
            amount: 1,
          },
        ]);
      }
    } catch {
      toast.error("Erro na adição do produto");
      return;
    }
  };

  const removeProduct = (productId: number) => {
    try {
      setCart(cart.filter((product) => product.id !== productId));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const response = await api.get(`/stock/${productId}`);
      const stock: Stock = response.data;

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
      } else {
        setCart(
          cart.map((product) => {
            if (product.id === productId) {
              return {
                ...product,
                amount: amount,
              };
            } else {
              return product;
            }
          })
        );
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
