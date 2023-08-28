
import javax.swing.JOptionPane;

public class Main
{

    public static void infoBox(String infoMessage, String titleBar)
    {
        JOptionPane.showMessageDialog(null, infoMessage, "InfoBox: " + titleBar, JOptionPane.INFORMATION_MESSAGE);
    }

    public static void main(String[] args) {
        infoBox(args[0], args[1]);
        System.out.println("\n\n\n" + Main.class.getName());
    }
}