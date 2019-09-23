import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavController, ModalController, ActionSheetController, LoadingController, AlertController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { PlacesService } from '../../places.service';
import { Place } from '../../places.model';
import { CreateBookingComponent } from '../../../bookings/create-booking/create-booking.component';
import { BookingService } from '../../../bookings/booking.service';
import { AuthService } from '../../../auth/auth.service';
import { MapModalComponent } from '../../../shared/map-modal/map-modal.component';
import { switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-place-detail',
  templateUrl: './place-detail.page.html',
  styleUrls: ['./place-detail.page.scss'],
})
export class PlaceDetailPage implements OnInit, OnDestroy {
  isLoading = false;
  place: Place;
  isBookable = false;
  private placeSub: Subscription;

  constructor(private activatedRoute: ActivatedRoute,
              private placesService: PlacesService,
              private navCtrl: NavController,
              private modalCtrl: ModalController,
              private actionSheetCtrl: ActionSheetController,
              private bookingService: BookingService,
              private authService: AuthService,
              private loadingCtrl: LoadingController,
              private alertCtrl: AlertController,
              private router: Router) { }

  ngOnInit() {
    this.activatedRoute.paramMap.subscribe(paramMap => {
      if (!paramMap.has('placeId')) {
        this.navCtrl.navigateBack('/places/tabs/offers');
        return;
      }
      this.isLoading = true;
      let fetchedUserId: string;
      this.authService.userId.pipe(
        take(1),
        switchMap(userId => {
        if (!userId) {
          throw new Error('User not found!');
        }
        fetchedUserId = userId;
        return this.placesService.getPlace(paramMap.get('placeId'));
      })).subscribe(
          place => {
        this.place = place;
        this.isBookable = this.place.userID !== fetchedUserId;
        this.isLoading = false;
      },
      error => {
        this.alertCtrl.create({
          header: 'An error occurred',
          message: 'Something went wrong. Please try again later',
          buttons: [{ text: 'Okay', handler: () => {
            this.router.navigate(['/places/tabs/discover']);
          }}]
        }).then(alertEl => {
          alertEl.present();
        });
      });
    });
  }

  onBookPlace() {
    this.actionSheetCtrl.create({
      header: 'Choose an action',
      buttons: [
        {
          text: 'Select Date',
          handler: () => {
            this.openBookingModal('select');
          }
        },
        {
          text: 'Random Date',
          handler: () => {
            this.openBookingModal('random');
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    }).then(actionSheetEl => {
      actionSheetEl.present();
    });
  }

  openBookingModal(mode: 'select' | 'random') {
    console.log(mode);
    this.modalCtrl
    .create({
      component: CreateBookingComponent,
      componentProps: {selectedPlace: this.place, selectedMode: mode}
    }).then(
      modalEl => {
      modalEl.present();
      return modalEl.onDidDismiss();
    }).then(
      resultData => {
      console.log(resultData.data, resultData.role);
      if (resultData.role === 'confirm') {
        this.loadingCtrl.create({message: 'Booking place..'}).then(loadingEl => {
          loadingEl.present();
          const data = resultData.data.bookingData;
          this.bookingService.addBooking(
            this.place.id,
            this.place.title,
            this.place.imageUrl,
            data.firstName,
            data.lastName,
            data.guestNumber,
            data.startDate,
            data.endDate).subscribe(() => {
              loadingEl.dismiss();
              this.router.navigate(['/bookings']);
            });
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.placeSub) {
      this.placeSub.unsubscribe();
    }
  }

  onOpenFullMap() {
    this.modalCtrl.create({
      component: MapModalComponent,
      componentProps: {
        center: {lat: this.place.location.lat, lng: this.place.location.lng},
        closeButtonText: 'Close',
        selectable: false,
        title: this.place.location.address
      }
    }).then(
      modalEl => {
        modalEl.present();
      }
    );
  }

}
