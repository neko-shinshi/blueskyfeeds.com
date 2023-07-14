import {createContext, useContext, useEffect, useState} from "react";

const WidthContext = createContext(0)

function WidthProvider ({children}) {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    const updateDimensions = () => {
        setWidth(window.innerWidth);
    }

    return <WidthContext.Provider value={width}>
        {children}
    </WidthContext.Provider>
}

function useWidth() {
    const context = useContext(WidthContext);
    if (context === undefined) {
        throw new Error('useCount must be used within a CountProvider')
    }
    return context;
}

export {WidthProvider, useWidth}