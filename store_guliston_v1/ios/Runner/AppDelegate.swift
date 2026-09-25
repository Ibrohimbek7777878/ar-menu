import UIKit
import Flutter
import GoogleMaps  // ← Google Maps uchun

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Google Maps API Key ni o'rnatish
    // MUHIM: "YOUR_API_KEY" ni Google Cloud dan olgan API Key bilan almashtiring!
    GMSServices.provideAPIKey("YOUR_API_KEY")

    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}